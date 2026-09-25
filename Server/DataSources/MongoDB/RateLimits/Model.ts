import mongoose, { Schema, type Document } from 'mongoose';

/**
 * Requests counted in one window for one caller: `token:<UserGUID>` or
 * `address:<addressKey>`. Stored so every instance shares the count and a
 * restart doesn't reset it. Mongo removes each row once its window ends.
 */
export interface IRateLimit extends Document {
  key: string;
  count: number;
  resetAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
    resetAt: { type: Date, required: true, expires: 0 },
  },
  { collection: 'rate_limits' },
);

export const RateLimits =
  (mongoose.models.RateLimits as mongoose.Model<IRateLimit>)
  || mongoose.model<IRateLimit>('RateLimits', RateLimitSchema);
