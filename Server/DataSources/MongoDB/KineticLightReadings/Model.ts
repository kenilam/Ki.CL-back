import mongoose, { Schema, type Document, Types } from 'mongoose';

import {
  KineticLightStatus,
  type KineticLightArrangement,
  type KineticLightChord,
  type KineticLightSource,
  type KineticLightStage,
} from 'server/Types/graphql.js';

const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

export const KineticLightFailure = {
  NoMusic: 'no_music',
  Unavailable: 'unavailable',
} as const;

export type KineticLightFailure = (typeof KineticLightFailure)[keyof typeof KineticLightFailure];

export type KineticLightReadingChord = Omit<KineticLightChord, '__typename'>;

export interface IKineticLightReading extends Document {
  _id: Types.ObjectId;
  ownerGUID: string | null;
  source: KineticLightSource;
  status: KineticLightStatus;
  stage: KineticLightStage | null;
  bars: number | null;
  notes: number | null;
  failure: KineticLightFailure | null;
  musicxml: string | null;
  midi: string | null;
  title: string;
  tempo: number | null;
  beatsPerBar: number | null;
  chords: KineticLightReadingChord[];
  arrangement: KineticLightArrangement | null;
  example: boolean;
  dismissedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChordSchema = new Schema<KineticLightReadingChord>(
  {
    bar: { type: Number, required: true },
    beat: { type: Number, required: true },
    symbol: { type: String, required: true },
  },
  { _id: false },
);

const KineticLightReadingSchema = new Schema<IKineticLightReading>(
  {
    ownerGUID: { type: String, default: null },
    source: { type: String, required: true },
    status: { type: String, required: true },
    stage: { type: String, default: null },
    bars: { type: Number, default: null },
    notes: { type: Number, default: null },
    failure: { type: String, default: null },
    musicxml: { type: String, default: null },
    midi: { type: String, default: null },
    title: { type: String, required: true },
    tempo: { type: Number, default: null },
    beatsPerBar: { type: Number, default: null },
    chords: { type: [ChordSchema], default: [] },
    arrangement: { type: Schema.Types.Mixed, default: null },
    example: { type: Boolean, default: false },
    dismissedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + KEEP_MS) },
  },
  {
    timestamps: true,
    collection: 'kinetic_light_readings',
  },
);

KineticLightReadingSchema.index({ ownerGUID: 1, createdAt: -1 });
KineticLightReadingSchema.index(
  { ownerGUID: 1 },
  { unique: true, partialFilterExpression: { status: KineticLightStatus.Reading } },
);
KineticLightReadingSchema.index(
  { example: 1, createdAt: 1 },
  { partialFilterExpression: { example: true } },
);
KineticLightReadingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const KineticLightReadings =
  (mongoose.models.KineticLightReadings as mongoose.Model<IKineticLightReading>)
  || mongoose.model<IKineticLightReading>('KineticLightReadings', KineticLightReadingSchema);
