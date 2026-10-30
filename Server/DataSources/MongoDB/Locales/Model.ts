import { randomUUID } from 'node:crypto';
import mongoose, { Schema, type Document } from 'mongoose';

export const SOURCE = 'en-US';

export interface ILocale extends Document<string> {
  tag: string;
  prompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function isCanonical(tag: string): boolean {
  try {
    return Intl.getCanonicalLocales(tag)[0] === tag;
  } catch {
    return false;
  }
}

const LocaleSchema = new Schema<ILocale>(
  {
    _id: { type: String, default: () => randomUUID() },
    tag: {
      type: String,
      required: true,
      unique: true,
      validate: { validator: isCanonical, message: '{VALUE} is not a canonical BCP 47 language tag.' },
    },
    prompt: { type: String },
  },
  {
    collection: 'locales',
    timestamps: true,
  },
);

export const Locales = mongoose.models.Locales as mongoose.Model<ILocale> || mongoose.model<ILocale>('Locales', LocaleSchema);
