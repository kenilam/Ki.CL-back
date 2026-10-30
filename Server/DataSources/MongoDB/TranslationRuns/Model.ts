import mongoose, { Schema, type Document } from 'mongoose';
import { AcceptLanguage } from 'server/DataSources/MongoDB/Translations/acceptLanguage.js';

export interface ITranslationRun extends Document {
  'accept-language': AcceptLanguage;
  createdAt: Date;
  updatedAt: Date;
}

const TranslationRunSchema = new Schema<ITranslationRun>(
  {
    'accept-language': { type: String, enum: Object.values(AcceptLanguage), required: true, unique: true },
  },
  {
    collection: 'translation-runs',
    timestamps: true,
  },
);

export const TranslationRuns = mongoose.models.TranslationRuns as mongoose.Model<ITranslationRun> || mongoose.model<ITranslationRun>('TranslationRuns', TranslationRunSchema);
