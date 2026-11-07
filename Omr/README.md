# Omr

Reads the notes in an image or PDF of sheet music for the Kinetic Light
experiment. The API sends it the file someone opened, gets back MusicXML,
and passes it on to the host, which plays it.

A PDF made by notation software is read from how it's drawn, and anything
else goes to an optical music recognition program:

- `drawing.py` reads PDFs from Sibelius, Finale, Dorico and MuseScore. These
  programs draw each notehead, clef, accidental, rest and flag as a character
  of a music font at an exact position, and the staff lines, stems, beams and
  ties as shapes, so pitch and rhythm can be read without guessing from
  pixels. On the first four pages of Robert Miles' Fable it got all 137 melody
  notes right against the song's MIDI, where Audiveris, which this service
  used to run for full scores, got 75%. Two of Fable's parts are printed an
  octave above what the MIDI plays, with a plain clef, as a bass guitar is
  written, and no reader can see that on the page.
- [homr](https://github.com/liebharc/homr) 0.7.0 reads scans and photos of
  lead sheets and piano music. On an Aerith's Theme lead sheet it read the
  first 19 notes right and found all 35 bars, where the best free Gemini model
  got 5 of those notes right. It can't tell which staves belong to the same
  system, so a scanned full score plays its staves one after another.

## Running it

```bash
make omr.install   # homr in a Python 3.12 venv in Omr/.venv
make omr.run       # listens on :3400
```

The API finds the server at `KINETIC_LIGHT_OMR_URL`, `http://localhost:3400` by
default. Without it, images and PDFs still play their chords.

- `POST /read` takes the file as the body, with its type as `Content-Type`:
  PNG, JPEG, GIF, WebP or PDF, up to 8 MB. It answers
  `{ "musicxml": "…", "lines": [4, 6, 4, …], "notes": 103 }`, where `lines` is
  the number of bars on each line of music, from the top, and `notes` counts the
  pitched notes. It answers 422 when it finds no music.
- `GET /health` answers 200.

## How a file is read

Only the first four pages are read. A PDF goes to `drawing.py` first, which
answers in under three seconds. When it finds no music font or too few notes,
the file goes to homr, which only reads images, so a PDF's pages are rendered
at 200 dpi with pypdfium2, each page is read on its own, and their bars are
joined into one score. Files are read one at a time.

Music fonts number their symbols in one of three ways, and `drawing.py` picks
the one that covers most of each font's characters:

- SMuFL, the standard behind Dorico, MuseScore 3 and 4 and Finale 27, with
  fonts such as Bravura, Leland and Sebastian.
- MuseScore 1 and 2's own MScore font.
- Sonata's layout, which Sibelius's Opus and Finale's older Maestro and
  Engraver fonts follow. These are found by name, or by drawing noteheads and
  a clef when at least 80% of the font's characters are music symbols, since a
  PDF printed through Windows renames its fonts.

From the drawing it finds the staves from their five lines and groups them
into systems by the bar lines that join them. MuseScore draws staff lines one
bar at a time and a system's opening line in pieces, so touching pieces are
joined first. A note far above or below its staff belongs to the staff its
ledger lines lead to, which isn't always the nearest one: Fable's low pad notes
hang eight ledger lines under one staff, onto the lines of the next. A clef's
line is read from where it sits, so a C clef can be alto or tenor.

Within a bar, events in every staff that line up vertically happen together,
and each one starts when the earliest note or rest still sounding ends. A
note pushed aside in a chord, because it's a second away from its neighbour,
still belongs to its chord's beat. When a staff's next event doesn't line up
with anything, it starts where that staff's last event ended, since a voice
has no gaps. Ties join a note to the next one at the same staff position, which
also keeps its accidental across the bar line. A tuplet number counts only
when it sits centred on a beam carrying that many notes, so fingering numbers
next to notes aren't taken for one.

pdfium's text layer drops a glyph drawn close to an identical one, to undo fake
bold, which loses the middle note of a tight chord. A text object with no text
takes the character of a recent one in the same font that renders to the same
pixels.

The time signature comes from its digits, or the common or cut time sign. A
score with none, such as an early-music edition, gets no `<time>`, and each bar
lasts as long as its notes and rests, which is how the host then plays it.

On Final Fantasy Eternity, a Finale piano sheet, it read all 397 notes that
homr and Audiveris agree on. On nine PDFs from Dorico 4 to 6 and MuseScore 1.3
to 3.6, the notes and rests of 426 of 453 bars add up to the time signature,
and the few bars in each whose pitches I checked by eye were right. Some of the
rest are written short on purpose, such as a pickup or a bar split around a
repeat. PDFs from LilyPond,
whose music font has no character codes, and PDFs whose text was turned into
outlines, go to homr.

On an M5 Max, Fable's four pages took 2.2 seconds, Danny Boy's, a Dorico choir
score, 0.9, and Interstellar's, a scan read by homr, 20.

## Why `lines`

The chord model sometimes leaves out a bar that has no chord symbol, which
moves every later chord a bar early. The API tells the model how many bars
each line has and numbers its bars from the start of each line, so a mistake
stays on its own line. A line starts at a measure that begins a new system.

## Deploying

The image is built from `python:3.12-slim` for `linux/amd64`, the platform
Cloud Run runs:

```bash
docker build --platform linux/amd64 -t omr Omr
```

It downloads homr's models while it builds (`homr --init`) and comes to
about 690 MB. Limited to 2 GiB, the container peaked at 1.3 GB while it read
Fable, Interstellar and six other test files, so give the service 2 GiB.

Run it as its own Cloud Run service that only the API's service account can
invoke, and set `KINETIC_LIGHT_OMR_URL` on the API to its `https://` address.
The API then sends an ID token for that address, taken from the metadata
server.

## Licence

homr is AGPL-3.0. It runs here unmodified, as a separate program behind its own
service, and this wrapper is our own code. homr's note-reading weights were
trained partly on PrIMuS, which is licensed for non-commercial use only (CC
BY-NC 4.0). That's fine for a personal site; check it again before any
commercial use.
