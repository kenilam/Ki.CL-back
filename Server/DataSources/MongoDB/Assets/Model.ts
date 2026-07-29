import mongoose, { Schema, type Document, Types } from 'mongoose';

/**
 * Stored media reference (GCS proxy path, etc.).
 * `generator` null ⇒ manually created / uploaded (not AI-produced).
 */
export interface IAsset extends Document {
  _id: Types.ObjectId;
  /** Public or proxied URL/path, e.g. `/assets/taxon-visual/123.png`. */
  url: string;
  /**
   * How the bytes were produced, e.g. `openai:gpt-image-1`.
   * Omit / null for manual assets.
   */
  generator: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    url: {
      type: String,
      required: true,
    },
    generator: {
      type: String,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'assets',
  },
);

export const Assets =
  (mongoose.models.Assets as mongoose.Model<IAsset>)
  || mongoose.model<IAsset>('Assets', AssetSchema);
