import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import xml.etree.ElementTree as ElementTree
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pypdfium2
from PIL import Image

import drawing

PORT = int(os.environ.get('PORT', '3400'))
MAX_BYTES = 8 * 1024 * 1024
MAX_PAGES = 4
PDF_SCALE = 200 / 72
TIMEOUT_SECONDS = 120
KINDS = {'application/pdf', 'image/gif', 'image/jpeg', 'image/png', 'image/webp'}
HOMR = str(Path(sys.executable).with_name('homr'))

lock = threading.Lock()


def pages(data: bytes, kind: str) -> list[Image.Image]:
    if kind != 'application/pdf':
        return [Image.open(io.BytesIO(data)).convert('RGB')]

    document = pypdfium2.PdfDocument(data)

    return [document[index].render(scale=PDF_SCALE).to_pil() for index in range(min(len(document), MAX_PAGES))]


def lines_of(score: ElementTree.Element) -> list[int]:
    lines = []

    for index, measure in enumerate(score.find('part').findall('measure')):
        if index == 0 or measure.find('print[@new-system="yes"]') is not None:
            lines.append(0)

        lines[-1] += 1

    return lines


def join(scores: list[ElementTree.Element]) -> ElementTree.Element:
    parts = scores[0].findall('part')

    for score in scores[1:]:
        for part, later in zip(parts, score.findall('part')):
            part.extend(later.findall('measure'))

    for part in parts:
        for number, measure in enumerate(part.findall('measure'), start=1):
            measure.set('number', str(number))

    return scores[0]


def read_pages(data: bytes, kind: str, folder: Path) -> list[ElementTree.Element]:
    scores = []

    for index, page in enumerate(pages(data, kind)):
        image = folder / f'page-{index}.png'
        page.save(image)

        subprocess.run(
            [HOMR, str(image)],
            check=False,
            cwd=folder,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=TIMEOUT_SECONDS,
        )

        output = image.with_suffix('.musicxml')

        if output.exists():
            scores.append(ElementTree.parse(output).getroot())

    return scores


def read_drawing(data: bytes) -> list[ElementTree.Element]:
    try:
        score = drawing.read(data, MAX_PAGES)
    except Exception as error:
        print(f'[omr] reading the drawing failed: {error!r}', flush=True)
        return []

    return [score] if score is not None else []


def answer(scores: list[ElementTree.Element]) -> bytes:
    lines = [count for score in scores for count in lines_of(score)]
    score = join(scores)
    notes = sum(1 for note in score.iter('note') if note.find('pitch') is not None)
    musicxml = ElementTree.tostring(score, encoding='unicode', xml_declaration=True)

    return json.dumps({'lines': lines, 'musicxml': musicxml, 'notes': notes}).encode()


def read(data: bytes, kind: str) -> bytes | None:
    if kind == 'application/pdf':
        scores = read_drawing(data)

        if scores:
            return answer(scores)

    with tempfile.TemporaryDirectory() as name:
        scores = read_pages(data, kind, Path(name))

    return answer(scores) if scores else None


class Handler(BaseHTTPRequestHandler):
    def answer(self, status: int, body: bytes = b'', kind: str = 'text/plain') -> None:
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        self.answer(200 if self.path == '/health' else 404)

    def do_POST(self) -> None:
        kind = self.headers.get('Content-Type', '').split(';')[0].strip()
        length = int(self.headers.get('Content-Length') or 0)

        if self.path != '/read':
            self.answer(404)
            return

        if kind not in KINDS or not 0 < length <= MAX_BYTES:
            self.answer(400)
            return

        try:
            with lock:
                music = read(self.rfile.read(length), kind)
        except subprocess.TimeoutExpired:
            self.answer(504)
            return
        except (OSError, ValueError, ElementTree.ParseError, pypdfium2.PdfiumError):
            self.answer(400)
            return

        if not music:
            self.answer(422)
            return

        self.answer(200, music, 'application/json')

    def log_message(self, format: str, *args: object) -> None:
        print(f'[omr] {self.address_string()} {format % args}', flush=True)


if __name__ == '__main__':
    print(f'[omr] listening on {PORT}', flush=True)
    ThreadingHTTPServer(('', PORT), Handler).serve_forever()
