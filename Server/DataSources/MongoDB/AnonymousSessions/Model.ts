import mongoose, { Schema, type Document } from 'mongoose';

/**
 * One anonymous identity handed out by ExchangeToken, and the address that
 * asked for it. Counted per address so clearing cookies can't create new
 * allowances without limit. Rows expire after a day.
 */
export interface IAnonymousSession extends Document {
  addressKey: string;
  UserGUID: string;
  createdAt: Date;
}

const AnonymousSessionSchema = new Schema<IAnonymousSession>(
  {
    addressKey: { type: String, required: true },
    UserGUID: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date(), expires: 24 * 60 * 60 },
  },
  { collection: 'anonymous_sessions' },
);

AnonymousSessionSchema.index({ addressKey: 1, createdAt: -1 });

export const AnonymousSessions =
  (mongoose.models.AnonymousSessions as mongoose.Model<IAnonymousSession>)
  || mongoose.model<IAnonymousSession>('AnonymousSessions', AnonymousSessionSchema);
