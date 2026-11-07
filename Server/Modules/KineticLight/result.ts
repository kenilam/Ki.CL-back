import type { IKineticLightReading } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';

type LeanReading = Pick<
  IKineticLightReading,
  | '_id'
  | 'ownerGUID'
  | 'source'
  | 'status'
  | 'stage'
  | 'bars'
  | 'notes'
  | 'failure'
  | 'musicxml'
  | 'midi'
  | 'title'
  | 'tempo'
  | 'beatsPerBar'
  | 'chords'
  | 'arrangement'
  | 'createdAt'
  | 'updatedAt'
>;

type LeanSong = Pick<IKineticLightReading, '_id' | 'createdAt' | 'source' | 'title'>;

export type ReadingResult = ReturnType<typeof toResult>;

export function toSong({ _id, createdAt, source, title }: LeanSong) {
  return { createdAt, id: String(_id), source, title };
}

export function toResult(reading: LeanReading) {
  return {
    id: String(reading._id),
    ownerGUID: reading.ownerGUID,
    source: reading.source,
    status: reading.status,
    stage: reading.stage,
    bars: reading.bars,
    notes: reading.notes,
    failure: reading.failure,
    musicxml: reading.musicxml,
    midi: reading.midi,
    title: reading.title,
    tempo: reading.tempo,
    beatsPerBar: reading.beatsPerBar,
    chords: reading.chords,
    arrangement: reading.arrangement ?? null,
    createdAt: reading.createdAt,
    updatedAt: reading.updatedAt,
  };
}
