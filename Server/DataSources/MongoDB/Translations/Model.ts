import mongoose, { Schema, type Document } from 'mongoose';

/**
 * One string of the site's writing in one language. The owning repo keeps the
 * namespace as a JSON file, and `Scripts/translations.ts` copies it here, one
 * row for each string.
 */
export interface ITranslation extends Document {
  language: string;
  namespace: string;
  /** The key's path in the namespace, joined with dots: `account.signOut`. */
  field: string;
  /** A string, or an array where i18next returns a list whole. */
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const TranslationSchema = new Schema<ITranslation>(
  {
    language: { type: String, required: true },
    namespace: { type: String, required: true },
    field: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  {
    collection: 'translations',
    timestamps: true,
  },
);

TranslationSchema.index({ language: 1, namespace: 1, field: 1 }, { unique: true });

export const Translations = mongoose.models.Translations as mongoose.Model<ITranslation> || mongoose.model<ITranslation>('Translations', TranslationSchema);
