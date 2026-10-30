import mongoose, { Schema, type Document } from 'mongoose';
import { AcceptLanguage } from './acceptLanguage.js';

export interface ITranslation extends Document {
  'accept-language': AcceptLanguage;
  namespace: string;
  /** The key's path in the namespace, joined with dots: `account.signOut`. A list's items are numbered: `lines.0`. */
  field: string;
  value: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TranslationSchema = new Schema<ITranslation>(
  {
    'accept-language': { type: String, enum: Object.values(AcceptLanguage), required: true },
    namespace: { type: String, required: true },
    field: { type: String, required: true },
    value: { type: String, required: true },
    source: { type: String },
  },
  {
    collection: 'translations',
    timestamps: true,
  },
);

TranslationSchema.index({ 'accept-language': 1, namespace: 1, field: 1 }, { unique: true });

export const Translations = mongoose.models.Translations as mongoose.Model<ITranslation> || mongoose.model<ITranslation>('Translations', TranslationSchema);
