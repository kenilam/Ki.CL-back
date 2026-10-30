import mongoose, { Schema, type Document } from 'mongoose';

export interface ITranslationRun extends Document {
  'accept-language': string;
  createdAt: Date;
  updatedAt: Date;
}

const TranslationRunSchema = new Schema<ITranslationRun>(
  {
    'accept-language': { type: String, required: true, unique: true },
  },
  {
    collection: 'translation-runs',
    timestamps: true,
  },
);

export const TranslationRuns = mongoose.models.TranslationRuns as mongoose.Model<ITranslationRun> || mongoose.model<ITranslationRun>('TranslationRuns', TranslationRunSchema);
