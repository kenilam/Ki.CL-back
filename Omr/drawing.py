import ctypes
import math
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass, field

import pypdfium2
import pypdfium2.raw as raw

MUSIC_FONTS = ('Opus', 'Maestro', 'Sonata', 'Petrucci', 'Engraver', 'Jazz', 'Reprise', 'Broadway')
MIN_NOTES = 8
MIN_SYMBOLS = 3
MIN_SHARE = 0.8
DIVISIONS = 48
DIGITS = '0123456789'

SONATA = {
    'œ': 'noteheadBlack',
    '˙': 'noteheadHalf',
    'w': 'noteheadWhole',
    'W': 'noteheadDoubleWhole',
    '∑': 'restWhole',
    'Ó': 'restHalf',
    'Œ': 'restQuarter',
    '‰': 'rest8th',
    '≈': 'rest16th',
    '®': 'rest32nd',
    'J': 'flag8thUp',
    'j': 'flag8thDown',
    'R': 'flag16thUp',
    'r': 'flag16thDown',
    'Â': 'flag32ndUp',
    'Ù': 'flag32ndDown',
    '#': 'accidentalSharp',
    'b': 'accidentalFlat',
    'n': 'accidentalNatural',
    'Ü': 'accidentalDoubleSharp',
    'º': 'accidentalDoubleFlat',
    '™': 'augmentationDot',
    '.': 'augmentationDot',
    '&': 'gClef',
    '?': 'fClef',
    'B': 'cClef',
    '/': 'unpitchedPercussionClef1',
    'c': 'timeSigCommon',
    'C': 'timeSigCutCommon',
    **{digit: f'timeSig{digit}' for digit in DIGITS},
}

SMUFL = {
    '\ue0a4': 'noteheadBlack',
    '\ue0a3': 'noteheadHalf',
    '\ue0a2': 'noteheadWhole',
    '\ue0a0': 'noteheadDoubleWhole',
    '\ue0a1': 'noteheadDoubleWhole',
    '\uf4be': 'noteheadBlack',
    '\uf4bd': 'noteheadHalf',
    '\uf4bc': 'noteheadWhole',
    '\uf4ba': 'noteheadDoubleWhole',
    '\ue4e2': 'restDoubleWhole',
    '\ue4e3': 'restWhole',
    '\ue4f4': 'restWhole',
    '\ue4e4': 'restHalf',
    '\ue4f5': 'restHalf',
    '\ue4e5': 'restQuarter',
    '\ue4e6': 'rest8th',
    '\ue4e7': 'rest16th',
    '\ue4e8': 'rest32nd',
    '\ue4e9': 'rest64th',
    '\ue240': 'flag8thUp',
    '\ue241': 'flag8thDown',
    '\ue242': 'flag16thUp',
    '\ue243': 'flag16thDown',
    '\ue244': 'flag32ndUp',
    '\ue245': 'flag32ndDown',
    '\ue246': 'flag64thUp',
    '\ue247': 'flag64thDown',
    '\ue262': 'accidentalSharp',
    '\ue260': 'accidentalFlat',
    '\ue261': 'accidentalNatural',
    '\ue263': 'accidentalDoubleSharp',
    '\ue264': 'accidentalDoubleFlat',
    '\ue1e7': 'augmentationDot',
    '\ue050': 'gClef',
    '\ue062': 'fClef',
    '\ue05c': 'cClef',
    '\ue052': 'gClef8vb',
    '\ue055': 'gClef8vb',
    '\ue056': 'gClef8vb',
    '\ue057': 'gClef8vb',
    '\ue053': 'gClef8va',
    '\ue064': 'fClef8vb',
    '\ue069': 'unpitchedPercussionClef1',
    '\ue06a': 'unpitchedPercussionClef1',
    '\ue08a': 'timeSigCommon',
    '\ue08b': 'timeSigCutCommon',
    **{chr(0xE080 + digit): f'timeSig{digit}' for digit in range(10)},
    **{chr(0xE880 + digit): f'tuplet{digit}' for digit in range(10)},
}

MSCORE = {
    '\ue12d': 'noteheadBlack',
    '\ue12c': 'noteheadHalf',
    '\ue12b': 'noteheadWhole',
    '\ue12a': 'noteheadDoubleWhole',
    '\ue1c6': 'noteheadDoubleWhole',
    '\ue106': 'restDoubleWhole',
    '\ue100': 'restWhole',
    '\ue102': 'restWhole',
    '\ue101': 'restHalf',
    '\ue103': 'restHalf',
    '\ue107': 'restQuarter',
    '\ue109': 'rest8th',
    '\ue10a': 'rest16th',
    '\ue10b': 'rest32nd',
    '\ue10c': 'rest64th',
    '\ue190': 'flag8thUp',
    '\ue194': 'flag8thDown',
    '\ue191': 'flag16thUp',
    '\ue197': 'flag16thDown',
    '\ue192': 'flag32ndUp',
    '\ue198': 'flag32ndDown',
    '\ue193': 'flag64thUp',
    '\ue199': 'flag64thDown',
    '\ue10e': 'accidentalSharp',
    '\ue114': 'accidentalFlat',
    '\ue113': 'accidentalNatural',
    '\ue11c': 'accidentalDoubleSharp',
    '\ue11a': 'accidentalDoubleFlat',
    '\ue127': 'augmentationDot',
    '\ue19e': 'gClef',
    '\ue19c': 'fClef',
    '\ue19a': 'cClef',
    '\ue1d7': 'gClef8vb',
    '\ue057': 'gClef8vb',
    '\ue1d8': 'gClef8va',
    '\ue1db': 'fClef8vb',
    '\ue1a0': 'unpitchedPercussionClef1',
    '\ue09a': 'timeSigCommon',
    '\ue09b': 'timeSigCutCommon',
    **{digit: f'timeSig{digit}' for digit in DIGITS},
}

HEADS = {'noteheadBlack': 1.0, 'noteheadHalf': 2.0, 'noteheadWhole': 4.0, 'noteheadDoubleWhole': 8.0}
RESTS = {'restDoubleWhole': 8.0, 'restWhole': 4.0, 'restHalf': 2.0, 'restQuarter': 1.0, 'rest8th': 0.5, 'rest16th': 0.25, 'rest32nd': 0.125, 'rest64th': 0.0625}
FLAGS = {'flag8thUp': 1, 'flag8thDown': 1, 'flag16thUp': 2, 'flag16thDown': 2, 'flag32ndUp': 3, 'flag32ndDown': 3, 'flag64thUp': 4, 'flag64thDown': 4}
ACCIDENTALS = {'accidentalSharp': 1, 'accidentalFlat': -1, 'accidentalNatural': 0, 'accidentalDoubleSharp': 2, 'accidentalDoubleFlat': -2}
KEYS = ('accidentalSharp', 'accidentalFlat')
DOT = 'augmentationDot'
CLEFS = {'gClef': 32, 'fClef': 24, 'cClef': 28, 'gClef8vb': 25, 'gClef8va': 39, 'fClef8vb': 17}
CLEF_LINES = (0, 2, 4, 6, 8)
PERCUSSION = 'unpitchedPercussionClef1'
COMMON = {'timeSigCommon': [4.0, 4], 'timeSigCutCommon': [4.0, 2]}
TUPLETS = {'tuplet2': 3 / 2, 'tuplet3': 2 / 3, 'tuplet4': 3 / 4, 'tuplet5': 4 / 5, 'tuplet6': 4 / 6, 'tuplet7': 4 / 7}
SEMITONES = [0, 2, 4, 5, 7, 9, 11]


@dataclass
class Glyph:
    ch: str
    x: float
    y: float
    em: float
    right: float
    font: str = ''


@dataclass
class Line:
    x0: float
    y0: float
    x1: float
    y1: float


@dataclass
class Staff:
    top: float
    bottom: float
    x0: float
    x1: float

    @property
    def space(self) -> float:
        return (self.top - self.bottom) / 4

    def position(self, y: float) -> int:
        return round((y - self.bottom) / (self.space / 2))


@dataclass
class Head:
    glyph: Glyph
    staff: int
    position: int
    pitch: int = 0
    accidental: int | None = None
    stem: Line | None = None
    beats: float = 1.0
    tie: bool = False
    midi: int = 0


@dataclass
class Event:
    staff: int
    x: float
    beats: float
    heads: list[Head] = field(default_factory=list)
    start: float | None = None


def is_music_font(name: str) -> bool:
    return any(font in name for font in MUSIC_FONTS)


def picture(page: pypdfium2.PdfPage, item: pypdfium2.PdfObject) -> tuple[int, int, bytes]:
    bitmap = raw.FPDFTextObj_GetRenderedBitmap(page.pdf.raw, page.raw, item.raw, 4)

    if not bitmap:
        return 0, 0, b''

    width, height = raw.FPDFBitmap_GetWidth(bitmap), raw.FPDFBitmap_GetHeight(bitmap)
    pixels = ctypes.string_at(raw.FPDFBitmap_GetBuffer(bitmap), raw.FPDFBitmap_GetStride(bitmap) * height)
    raw.FPDFBitmap_Destroy(bitmap)
    return width, height, pixels


def page_glyphs(page: pypdfium2.PdfPage) -> list[Glyph]:
    text = page.get_textpage()
    found: list[Glyph] = []
    offsets: dict[int, list[tuple[str, float]]] = {}
    recent: list[tuple[tuple[str, float], list[tuple[str, float]], pypdfium2.PdfObject]] = []

    for index in range(text.count_chars()):
        item = raw.FPDFText_GetTextObject(text.raw, index)
        x, y = ctypes.c_double(), ctypes.c_double()
        raw.FPDFText_GetCharOrigin(text.raw, index, ctypes.byref(x), ctypes.byref(y))
        offsets.setdefault(ctypes.cast(item, ctypes.c_void_p).value, []).append((chr(raw.FPDFText_GetUnicode(text.raw, index)), x.value))

    for item in page.get_objects(max_depth=5):
        if item.type != raw.FPDF_PAGEOBJ_TEXT:
            continue

        font = raw.FPDFTextObj_GetFont(item.raw)
        name = ctypes.create_string_buffer(128)
        raw.FPDFFont_GetBaseFontName(font, name, 128)
        matrix = raw.FS_MATRIX()
        raw.FPDFPageObj_GetMatrix(item.raw, ctypes.byref(matrix))
        size = ctypes.c_float()
        raw.FPDFTextObj_GetFontSize(item.raw, ctypes.byref(size))
        left, bottom, right, top = (ctypes.c_float() for _ in range(4))
        raw.FPDFPageObj_GetBounds(item.raw, ctypes.byref(left), ctypes.byref(bottom), ctypes.byref(right), ctypes.byref(top))
        font_name = name.value.decode('latin-1')
        style = (font_name, size.value)
        placed = offsets.get(ctypes.cast(item.raw, ctypes.c_void_p).value)

        if placed is None:
            drawn = picture(page, item)
            placed = next((twin for twin_style, twin, twin_item in reversed(recent) if twin_style == style and picture(page, twin_item) == drawn), [])
        elif len(placed) == 1:
            recent = [*recent[-4:], (style, placed, item)]

        characters = [(ch, x) for ch, x in placed if ch.strip()]

        if not characters:
            continue

        first = characters[0][1]

        for ch, x in characters:
            found.append(Glyph(ch, matrix.e + x - first, matrix.f, size.value * matrix.d, right.value if len(characters) == 1 else matrix.e + x - first + size.value * matrix.d * 0.3, font_name))

    encodings = {}

    for font in {glyph.font for glyph in found}:
        characters = [glyph.ch for glyph in found if glyph.font == font]
        smufl = sum(ch in SMUFL for ch in characters)
        mscore = sum(ch in MSCORE and ch not in DIGITS for ch in characters)
        heads = sum(SONATA.get(ch) in HEADS for ch in characters)
        clefs = any(SONATA.get(ch) in CLEFS for ch in characters)
        share = sum(ch in SONATA for ch in characters) / len(characters)

        if max(smufl, mscore) >= MIN_SYMBOLS:
            encodings[font] = SMUFL if smufl >= mscore else MSCORE
        elif is_music_font(font) or (heads >= MIN_SYMBOLS and clefs and share >= MIN_SHARE):
            encodings[font] = SONATA

    glyphs = []

    for glyph in found:
        encoding = encodings.get(glyph.font)

        if encoding is None and glyph.ch in DIGITS:
            glyph.ch = f'tuplet{glyph.ch}'
        elif encoding is not None and glyph.ch in encoding:
            glyph.ch = encoding[glyph.ch]
        else:
            continue

        glyphs.append(glyph)

    return glyphs


def calibrate(glyphs: list[Glyph], staves: list[Staff]) -> None:
    shifts: dict[str, list[float]] = {}

    for glyph in glyphs:
        if glyph.ch not in HEADS:
            continue

        for staff in staves:
            if staff.bottom - staff.space <= glyph.y <= staff.top + staff.space:
                steps = (glyph.y - staff.bottom) / (staff.space / 2)
                shifts.setdefault(glyph.font, []).append((steps - round(steps)) * staff.space / 2)
                break

    for font, values in shifts.items():
        shift = sorted(values)[len(values) // 2]

        for glyph in glyphs:
            if glyph.font == font:
                glyph.y -= shift


def page_shapes(page: pypdfium2.PdfPage) -> tuple[list[Line], list[list[tuple[float, float]]], list[list[tuple[float, float]]]]:
    lines, fills, curves = [], [], []

    for item in page.get_objects(max_depth=5):
        if item.type != raw.FPDF_PAGEOBJ_PATH:
            continue

        matrix = raw.FS_MATRIX()
        raw.FPDFPageObj_GetMatrix(item.raw, ctypes.byref(matrix))
        points, starts, curved = [], [], False

        for index in range(raw.FPDFPath_CountSegments(item.raw)):
            segment = raw.FPDFPath_GetPathSegment(item.raw, index)
            x, y = ctypes.c_float(), ctypes.c_float()
            raw.FPDFPathSegment_GetPoint(segment, ctypes.byref(x), ctypes.byref(y))
            kind = raw.FPDFPathSegment_GetType(segment)
            points.append((matrix.a * x.value + matrix.c * y.value + matrix.e, matrix.b * x.value + matrix.d * y.value + matrix.f))
            curved |= kind == raw.FPDF_SEGMENT_BEZIERTO

            if kind == raw.FPDF_SEGMENT_MOVETO:
                starts.append(index)

        fill, stroke = ctypes.c_int(), ctypes.c_int()
        raw.FPDFPath_GetDrawMode(item.raw, ctypes.byref(fill), ctypes.byref(stroke))

        if curved:
            curves.append(points)
        elif fill.value and len(points) >= 4:
            fills.append(points)
        elif stroke.value:
            for start, stop in zip(starts, starts[1:] + [len(points)]):
                if stop - start != 2:
                    continue

                (x0, y0), (x1, y1) = sorted(points[start:stop])
                lines.append(Line(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)))

    return lines, fills, curves


def find_staves(lines: list[Line]) -> list[Staff]:
    joined: list[Line] = []

    for line in sorted((line for line in lines if line.y1 - line.y0 < 0.05), key=lambda line: (round(line.y0, 1), line.x0)):
        last = joined[-1] if joined else None

        if last and abs(last.y0 - line.y0) < 0.05 and line.x0 <= last.x1 + 1:
            joined[-1] = Line(last.x0, last.y0, max(last.x1, line.x1), last.y1)
        else:
            joined.append(line)

    rows = sorted((line for line in joined if line.x1 - line.x0 > 60), key=lambda line: -line.y0)
    staves, group = [], []

    for line in rows:
        if group and len(group) < 5 and abs(group[-1].x0 - line.x0) < 1 and abs(group[-1].x1 - line.x1) < 1:
            gap = group[-1].y0 - line.y0
            expected = group[0].y0 - group[1].y0 if len(group) > 1 else gap

            if 0.5 < gap < 15 and abs(gap - expected) < 0.2:
                group.append(line)
                continue

        if len(group) == 5:
            staves.append(Staff(group[0].y0, group[4].y0, group[0].x0, group[0].x1))

        group = [line]

    if len(group) == 5:
        staves.append(Staff(group[0].y0, group[4].y0, group[0].x0, group[0].x1))

    return staves


def find_systems(staves: list[Staff], lines: list[Line]) -> list[list[int]]:
    parent = list(range(len(staves)))

    def root(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    joined: list[Line] = []

    for line in sorted((line for line in lines if line.x1 - line.x0 <= 0.05), key=lambda line: (round(line.x0, 1), line.y0)):
        last = joined[-1] if joined else None

        if last and abs(last.x0 - line.x0) < 0.05 and line.y0 <= last.y1 + 1:
            joined[-1] = Line(last.x0, last.y0, last.x1, max(last.y1, line.y1))
        else:
            joined.append(line)

    for line in joined:
        touched = [
            index
            for index, staff in enumerate(staves)
            if staff.x0 - 2 * staff.space <= line.x0 <= staff.x1 + 0.5 and line.y0 <= staff.top - 0.1 and line.y1 >= staff.bottom + 0.1
        ]

        for a, b in zip(touched, touched[1:]):
            if line.y0 <= staves[b].top + 0.1 and line.y1 >= staves[a].bottom - 0.1:
                parent[root(a)] = root(b)

    systems: dict[int, list[int]] = {}

    for index in range(len(staves)):
        systems.setdefault(root(index), []).append(index)

    return sorted(systems.values(), key=lambda members: -staves[members[0]].top)


def beside(event: Event, other: Event, space: float) -> bool:
    stemmed = [item for item in (event, other) if item.heads and item.heads[0].stem is not None]
    directions = {item.heads[0].stem.y0 < item.heads[0].glyph.y - space for item in stemmed}

    if event.staff != other.staff or (len(stemmed) == 2 and len(directions) == 1):
        return False

    return any(
        abs(head.position - neighbour.position) <= 1 and abs(abs(head.glyph.x - neighbour.glyph.x) - (neighbour.glyph.right - neighbour.glyph.x)) < space * 0.2
        for head in event.heads
        for neighbour in other.heads
    )


def nearest(items: list, key, limit: float):
    best = min(items, key=key, default=None)
    return best if best is not None and key(best) <= limit else None


def staff_for(glyph: Glyph, staves: list[Staff], members: list[int], ledgers: list[Line]) -> int | None:
    centre = glyph.x + staves[members[0]].space * 0.6
    on_lines = {round(staves[index].bottom + step * staves[index].space, 1) for index in members for step in range(5)}
    inside = None
    stacks = []

    for index in members:
        staff = staves[index]
        position = staff.position(glyph.y)

        if -1 <= position <= 9:
            inside = index
            continue

        needed = range(-2, position - 1, -2) if position < 0 else range(10, position + 1, 2)
        heights = [staff.bottom + step * staff.space / 2 for step in needed]
        gaps = [height for height in heights if all(abs(height - line) > staff.space * 0.2 for line in on_lines)]

        if not heights or abs(position) > 40:
            continue

        def ledger_at(height: float) -> bool:
            return any(abs(ledger.y0 - height) < staff.space * 0.2 and ledger.x0 - 0.5 <= centre <= ledger.x1 + 0.5 for ledger in ledgers)

        beyond = position - (2 if position % 2 == 0 else 1) if position < 0 else position + (2 if position % 2 == 0 else 1)
        beyond_height = staff.bottom + beyond * staff.space / 2

        if all(abs(beyond_height - line) > staff.space * 0.2 for line in on_lines) and ledger_at(beyond_height):
            continue

        found = [height for height in heights if ledger_at(height)]
        last = heights[-1]

        if last not in found and all(abs(last - line) > staff.space * 0.2 for line in on_lines):
            continue
        gap_found = [height for height in gaps if height in found]
        stacks.append((len(found) / len(heights), len(gap_found), -abs(position), index))

    complete = [stack for stack in stacks if stack[0] >= 0.8 and stack[1] >= 2]

    if complete:
        return max(complete)[3]

    if inside is not None:
        return inside

    near = [stack for stack in stacks if stack[0] >= 0.5]
    return max(near)[3] if near else None


def clef_at(clefs: list[tuple[float, tuple[int, int] | None]], x: float) -> tuple[int, int] | None:
    current = (2, 32)

    for at, clef in clefs:
        if at <= x:
            current = clef

    return current


def diatonic_of(position: int, clef: tuple[int, int]) -> int:
    line, reference = clef
    return reference + position - line


def pitch_of(diatonic: int, alter: int) -> int:
    octave, step = divmod(diatonic, 7)
    return 12 * (octave + 1) + SEMITONES[step] + alter


def read_system(
    staves: list[Staff],
    members: list[int],
    glyphs: list[Glyph],
    lines: list[Line],
    fills: list[list[tuple[float, float]]],
    curves: list[list[tuple[float, float]]],
    meter: list[float] | None,
) -> list[list[Event]]:
    space = sum(staves[index].space for index in members) / len(members)
    top, bottom = staves[members[0]].top, staves[members[-1]].bottom
    left, right = staves[members[0]].x0, staves[members[0]].x1
    inside = [glyph for glyph in glyphs if left - 3 * space <= glyph.x <= right + space and bottom - 14 * space <= glyph.y <= top + 14 * space]
    verticals = [line for line in lines if line.x1 - line.x0 < 0.05 and line.y1 - line.y0 > space * 0.8 and left - space <= line.x0 <= right + 0.5]
    ledgers = [line for line in lines if line.y1 - line.y0 < 0.05 and space < line.x1 - line.x0 < space * 4]
    full = space * 0.9

    def own(glyph: Glyph) -> int | None:
        return staff_for(glyph, staves, members, ledgers)

    staff_glyphs: dict[int, list[Glyph]] = {index: [] for index in members}

    for glyph in inside:
        index = own(glyph)

        if index is None and glyph.ch in RESTS:
            index = nearest(members, key=lambda member: abs(staves[member].position(glyph.y) - 4), limit=12)

        if index is not None:
            staff_glyphs[index].append(glyph)

    heads: list[Head] = []
    staff_clefs: dict[int, list[tuple[float, tuple[int, int] | None]]] = {}

    for index, owned in staff_glyphs.items():
        staff = staves[index]
        clefs = sorted(
            (glyph.x, (staff.position(glyph.y), CLEFS[glyph.ch]) if glyph.ch in CLEFS else None)
            for glyph in owned
            if glyph.ch == PERCUSSION or (glyph.ch in CLEFS and staff.position(glyph.y) in CLEF_LINES)
        )
        staff_clefs[index] = clefs
        percussion = any(clef is None for _, clef in clefs)

        if percussion:
            continue

        first_note = min((glyph.x for glyph in owned if glyph.ch in HEADS or glyph.ch in RESTS), default=right)
        clef_end = max((x for x, _ in clefs if x < first_note), default=left)
        key: dict[int, int] = {}

        for glyph in owned:
            if glyph.ch in KEYS and clef_end < glyph.x < first_note and glyph.em >= full * 4:
                clef = clef_at(clefs, glyph.x)
                key[diatonic_of(staff.position(glyph.y), clef) % 7] = ACCIDENTALS[glyph.ch]

        for glyph in owned:
            if glyph.ch not in HEADS or glyph.em < full * 3.4:
                continue

            clef = clef_at(clefs, glyph.x)
            heads.append(Head(glyph, index, staff.position(glyph.y)))
            heads[-1].pitch = diatonic_of(heads[-1].position, clef)

        staves[index].key = key

    for head in heads:
        for other in heads:
            if other is head or other.staff != head.staff or abs(other.glyph.x - head.glyph.x) > space * 0.3 or abs(other.position - head.position) != 1:
                continue

            below = head.position < -1 and other.position < -1
            above = head.position > 9 and other.position > 9

            if not (below and head.position < other.position) and not (above and head.position > other.position):
                continue

            for index in members:
                position = staves[index].position(head.glyph.y)
                clefs = staff_clefs.get(index, [])

                if index != head.staff and -1 <= position <= 9 and not any(clef is None for _, clef in clefs):
                    head.staff = index
                    head.position = position
                    head.pitch = diatonic_of(position, clef_at(clefs, head.glyph.x))
                    break

    for glyph in inside:
        if glyph.ch not in ACCIDENTALS or glyph.em < full * 3.4:
            continue

        target = nearest(
            [head for head in heads if abs(head.glyph.y - glyph.y) < space * 0.3 and 0 < head.glyph.x - glyph.x < space * 5],
            key=lambda head: head.glyph.x - glyph.x,
            limit=space * 5,
        )
        if target and target.accidental is None:
            target.accidental = ACCIDENTALS[glyph.ch]

    stems = []

    for line in verticals:
        if line.y1 - line.y0 > space * 12:
            continue

        attached = [
            head
            for head in heads
            if (abs(line.x0 - head.glyph.right) < 0.6 or abs(line.x0 - head.glyph.x) < 0.6)
            and line.y0 - space * 0.6 <= head.glyph.y <= line.y1 + space * 0.6
        ]

        if attached:
            stems.append((line, attached))

    stem_lines = {id(line) for line, _ in stems}

    for line, attached in stems:
        for head in attached:
            if head.glyph.ch == 'noteheadBlack':
                head.stem = line

    events: list[Event] = []
    by_stem: dict[int, Event] = {}

    for head in heads:
        if head.stem is not None:
            event = by_stem.get(id(head.stem))
            if event is None:
                event = Event(head.staff, head.glyph.x, 1.0)
                by_stem[id(head.stem)] = event
                events.append(event)
            event.heads.append(head)
            event.x = min(event.x, head.glyph.x)
            continue

        match = next((event for event in events if event.staff == head.staff and not any(h.stem for h in event.heads) and abs(event.x - head.glyph.x) < space * 0.6 and event.heads[0].glyph.ch == head.glyph.ch), None)

        if match:
            match.heads.append(head)
        else:
            events.append(Event(head.staff, head.glyph.x, HEADS[head.glyph.ch], [head]))

    for event in events:
        head = event.heads[0]
        beats = HEADS[head.glyph.ch]

        if head.stem is not None:
            stem = head.stem
            up = stem.y1 > max(h.glyph.y for h in event.heads) + space * 0.5
            tip = stem.y1 if up else stem.y0
            event.x = min(h.glyph.x for h in event.heads) if up else max(h.glyph.x for h in event.heads)
            beams = sum(
                1
                for shape in fills
                if min(p[0] for p in shape) - 0.4 <= stem.x0 <= max(p[0] for p in shape) + 0.4
                and stem.y0 - 0.2 <= max(p[1] for p in shape)
                and min(p[1] for p in shape) <= stem.y1 + 0.2
            )
            flag = nearest(
                [glyph for glyph in inside if glyph.ch in FLAGS],
                key=lambda glyph: abs(glyph.x - stem.x0) + abs(glyph.y - tip),
                limit=space * 1.5,
            )
            count = max(beams, FLAGS[flag.ch] if flag else 0)
            beats = 2.0 ** -count

        dot_right = max(h.glyph.right for h in event.heads)
        dots = [
            glyph
            for glyph in inside
            if glyph.ch == DOT
            and 0 < glyph.x - dot_right < space * 2.5
            and any(abs(glyph.y - h.glyph.y) <= space * 0.75 for h in event.heads)
            and not any(other.staff == event.staff and dot_right < other.glyph.x < glyph.x for other in heads)
        ]
        dot_count = len({round(glyph.x, 1) for glyph in dots})
        event.beats = beats * (2 - 0.5 ** dot_count)

    for number in inside:
        if number.ch not in TUPLETS:
            continue

        count = int(number.ch.removeprefix('tuplet'))
        best = None

        for shape in fills:
            x0, x1 = min(p[0] for p in shape), max(p[0] for p in shape)
            y0, y1 = min(p[1] for p in shape), max(p[1] for p in shape)
            middle = (x0 + x1) / 2
            gap = min(abs(number.y - y0), abs(number.y - y1))

            if abs(number.x + space * 0.3 - middle) > (x1 - x0) * 0.25 + space * 0.5 or gap > space * 2.5:
                continue

            group = [event for event in events if event.heads and event.heads[0].stem is not None and x0 - 0.4 <= event.heads[0].stem.x0 <= x1 + 0.4 and event.heads[0].stem.y0 - 0.2 <= y1 and y0 <= event.heads[0].stem.y1 + 0.2]
            heads_y = [head.glyph.y for event in group for head in event.heads]

            if len(group) != count or not heads_y:
                continue

            away = (number.y < y0) if sum(heads_y) / len(heads_y) > y1 else (number.y > y1)

            if away and (best is None or gap < best[0]):
                best = (gap, group)

        if best is not None:
            for event in best[1]:
                event.beats *= TUPLETS[number.ch]

    for index, owned in staff_glyphs.items():
        for glyph in owned:
            if glyph.ch in RESTS and glyph.em >= full * 3.4:
                dots = [g for g in inside if g.ch == DOT and 0 < g.x - glyph.right < space * 2 and abs(g.y - glyph.y) < space * 2]
                events.append(Event(index, glyph.x, RESTS[glyph.ch] * (1.5 if dots else 1.0)))

    barlines = sorted(
        {round(line.x0, 1) for line in verticals if id(line) not in stem_lines and any(line.y0 <= staves[index].bottom + 0.2 and line.y1 >= staves[index].top - 0.2 for index in members)}
    )
    edges: list[float] = []

    for x in barlines:
        if not edges or x - edges[-1] > space * 1.5:
            edges.append(x)
        else:
            edges[-1] = x

    if not edges or edges[0] - left > space * 2:
        edges.insert(0, left)

    if right - edges[-1] > space * 2:
        edges.append(right)

    ties = {(round(min(curve)[0], 1), round(min(curve)[1], 1), round(max(curve)[0], 1), round(max(curve)[1], 1)) for curve in curves}

    for begin_x, begin_y, end_x, end_y in sorted(ties):
        begin, end = (begin_x, begin_y), (end_x, end_y)
        sources = sorted(
            (head for head in heads if 0 <= begin[0] - head.glyph.x < space * 3 and abs(begin[1] - head.glyph.y) < space * 1.5),
            key=lambda head: (head.tie, abs(begin[0] - head.glyph.right) + abs(begin[1] - head.glyph.y)),
        )

        for source in sources:
            target = nearest(
                [
                    head
                    for head in heads
                    if head.staff == source.staff
                    and head.position == source.position
                    and head.glyph.x > source.glyph.right
                    and -space * 2 <= head.glyph.x - end[0] < space * 3
                    and abs(end[1] - head.glyph.y) < space * 1.5
                ],
                key=lambda head: abs(head.glyph.x - end[0]) + abs(end[1] - head.glyph.y),
                limit=space * 4,
            )

            if target is not None or (right - end[0] < space * 3 and not source.tie):
                source.tie = True
                break

    measures: list[list[Event]] = []

    for start, stop in zip(edges, edges[1:]):
        measure = sorted((event for event in events if start - space * 0.5 <= event.x < stop - space * 0.3), key=lambda event: event.x)

        if not measure:
            continue

        whole = [
            event
            for event in measure
            if not event.heads and event.beats == RESTS['restWhole'] and not any(e.staff == event.staff and e is not event for e in measure)
        ]

        for event in whole:
            event.start = 0.0

        columns: list[tuple[list[float], list[Event]]] = []

        for event in measure:
            if event in whole:
                continue

            matches = [
                index
                for index, (anchors, column) in enumerate(columns)
                if any(abs(event.x - x) < space * 0.8 for x in anchors) or any(beside(event, other, space) for other in column)
            ]

            if not matches:
                columns.append(([event.x], [event]))
                continue

            anchors, column = columns[matches[0]]

            for index in reversed(matches[1:]):
                other_anchors, other_column = columns.pop(index)
                anchors.extend(other_anchors)
                column.extend(other_column)

            column.append(event)

        now, active = 0.0, []

        for _, column in columns:
            if active:
                ends = [e.start + e.beats for e in active if e.start + e.beats > now + 1e-6]
                following = min(ends) if ends else now
                finished = [max((e.start + e.beats for e in active if e.staff == staff), default=following) for staff in {event.staff for event in column}]
                now = max(max(finished), now) if max(finished) < following - 1e-6 else following
            for event in column:
                event.start = now
            active.extend(column)

        length = meter[0] if meter else max((event.start + event.beats for event in measure if event not in whole), default=RESTS['restWhole'])

        for event in whole:
            event.beats = length

        measures.append(measure)

    for measure in measures:
        for event in measure:
            for head in event.heads:
                head.beats = event.beats

    return measures, edges


def spell(measures: list[list[Event]], staves: list[Staff]) -> None:
    for measure in measures:
        altered: dict[tuple[int, int], int] = {}

        for event in sorted(measure, key=lambda event: event.start or 0):
            for head in event.heads:
                key = getattr(staves[head.staff], 'key', {})
                slot = (head.staff, head.pitch)

                if head.accidental is not None:
                    altered[slot] = head.accidental

                alter = altered.get(slot, key.get(head.pitch % 7, 0))
                head.midi = pitch_of(head.pitch, alter)


def meter_of(glyphs: list[Glyph], staves: list[Staff]) -> list[float] | None:
    for staff in staves:
        digits = sorted((glyph for glyph in glyphs if glyph.ch.removeprefix('timeSig').isdigit() and staff.bottom - staff.space <= glyph.y <= staff.top + staff.space), key=lambda glyph: glyph.x)
        common = min((glyph for glyph in glyphs if glyph.ch in COMMON and staff.bottom <= glyph.y <= staff.top), key=lambda glyph: glyph.x, default=None)

        if common and (not digits or common.x < digits[0].x):
            return COMMON[common.ch]

        upper = [glyph for glyph in digits if staff.position(glyph.y) >= 4]
        lower = [glyph for glyph in digits if staff.position(glyph.y) < 4]

        if upper and lower:
            beats = int(''.join(glyph.ch.removeprefix('timeSig') for glyph in upper if abs(glyph.x - upper[0].x) < staff.space * 2))
            unit = int(''.join(glyph.ch.removeprefix('timeSig') for glyph in lower if abs(glyph.x - lower[0].x) < staff.space * 2))
            if beats and unit:
                return [beats * 4 / unit, beats]

    return None


def read(data: bytes, max_pages: int) -> ElementTree.Element | None:
    document = pypdfium2.PdfDocument(data)
    meter: list[float] | None = None
    bars: list[list[tuple[float, int, float, bool, int]]] = []
    lengths: list[float] = []
    lines: list[int] = []

    for index in range(min(len(document), max_pages)):
        page = document[index]
        glyphs = page_glyphs(page)

        if not glyphs:
            continue

        shapes, fills, curves = page_shapes(page)
        staves = find_staves(shapes)

        if not staves:
            continue

        calibrate(glyphs, staves)

        if not lines:
            meter = meter_of(glyphs, staves)

        for members in find_systems(staves, shapes):
            measures, _ = read_system(staves, members, glyphs, shapes, fills, curves, meter)
            spell(measures, staves)

            if not measures:
                continue

            lines.append(len(measures))

            for measure in measures:
                lengths.append(max(event.start + event.beats for event in measure))
                bars.append(
                    [
                        (event.start or 0.0, head.midi, event.beats, head.tie, head.pitch)
                        for event in measure
                        for head in event.heads
                    ]
                )

    notes = sum(len(bar) for bar in bars)

    if notes < MIN_NOTES:
        return None

    return to_musicxml(bars, lengths, lines, meter)


def to_musicxml(bars: list[list[tuple[float, int, float, bool, int]]], lengths: list[float], lines: list[int], meter: list[float] | None) -> ElementTree.Element:
    sizes = [meter[0] if meter else length for length in lengths]
    offsets = [sum(sizes[:number]) for number in range(len(bars))]
    held: dict[tuple[int, float], list[int]] = {}
    notes: list[tuple[int, float, int, float]] = []

    for number, bar in enumerate(bars):
        for start, pitch, beats, tie, diatonic in sorted(bar):
            at = offsets[number] + start
            waiting = held.get((diatonic, round(at, 3)))

            if waiting:
                index = waiting.pop()
                bar_index, onset, source, total = notes[index]
                notes[index] = (bar_index, onset, source, total + beats)
            else:
                notes.append((number, start, pitch, beats))
                index = len(notes) - 1

            if tie:
                held.setdefault((diatonic, round(at + beats, 3)), []).append(index)

    score = ElementTree.Element('score-partwise', version='4.0')
    part_list = ElementTree.SubElement(score, 'part-list')
    score_part = ElementTree.SubElement(part_list, 'score-part', id='P1')
    ElementTree.SubElement(score_part, 'part-name').text = 'Music'
    part = ElementTree.SubElement(score, 'part', id='P1')
    starts = {sum(lines[:index]) for index in range(len(lines))}

    for number in range(len(bars)):
        measure = ElementTree.SubElement(part, 'measure', number=str(number + 1))

        if number in starts:
            ElementTree.SubElement(measure, 'print', {'new-system': 'yes'})

        if number == 0:
            attributes = ElementTree.SubElement(measure, 'attributes')
            ElementTree.SubElement(attributes, 'divisions').text = str(DIVISIONS)

            if meter:
                time = ElementTree.SubElement(attributes, 'time')
                ElementTree.SubElement(time, 'beats').text = str(int(meter[1]))
                ElementTree.SubElement(time, 'beat-type').text = str(round(meter[1] * 4 / meter[0]))

        filled = False

        for bar_index, onset, pitch, beats in notes:
            if bar_index != number:
                continue

            filled = True
            offset = round(onset * DIVISIONS)
            duration = max(1, round(beats * DIVISIONS))

            if offset:
                forward = ElementTree.SubElement(measure, 'forward')
                ElementTree.SubElement(forward, 'duration').text = str(offset)

            note = ElementTree.SubElement(measure, 'note')
            octave, semitone = divmod(pitch, 12)
            names = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B']
            sharps = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
            element = ElementTree.SubElement(note, 'pitch')
            ElementTree.SubElement(element, 'step').text = names[semitone]
            if sharps[semitone]:
                ElementTree.SubElement(element, 'alter').text = '1'
            ElementTree.SubElement(element, 'octave').text = str(octave - 1)
            ElementTree.SubElement(note, 'duration').text = str(duration)
            backup = ElementTree.SubElement(measure, 'backup')
            ElementTree.SubElement(backup, 'duration').text = str(offset + duration)

        if not filled:
            rest = ElementTree.SubElement(measure, 'note')
            ElementTree.SubElement(rest, 'rest')
            ElementTree.SubElement(rest, 'duration').text = str(round(sizes[number] * DIVISIONS))
        elif meter is None:
            forward = ElementTree.SubElement(measure, 'forward')
            ElementTree.SubElement(forward, 'duration').text = str(round(sizes[number] * DIVISIONS))

    return score
