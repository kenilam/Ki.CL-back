import mongoose, { Schema, Types } from 'mongoose';

export const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

export type NotificationText = {
  key: string;
  values: Record<string, string | number>;
};

export interface INotification {
  _id: Types.ObjectId;
  ownerGUID: string;
  collection: string;
  documentId: string;
  title: NotificationText;
  message: NotificationText;
  dismissedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TextSchema = new Schema<NotificationText>(
  {
    key: { type: String, required: true },
    values: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, minimize: false },
);

const NotificationSchema = new Schema<INotification>(
  {
    ownerGUID: { type: String, required: true },
    collection: { type: String, required: true },
    documentId: { type: String, required: true },
    title: { type: TextSchema, required: true },
    message: { type: TextSchema, required: true },
    dismissedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + KEEP_MS) },
  },
  {
    collection: 'notifications',
    minimize: false,
    suppressReservedKeysWarning: true,
    timestamps: true,
  },
);

NotificationSchema.index({ ownerGUID: 1, collection: 1, documentId: 1 }, { unique: true });
NotificationSchema.index({ ownerGUID: 1, updatedAt: -1 });
NotificationSchema.index({ collection: 1, documentId: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notifications =
  (mongoose.models.Notifications as mongoose.Model<INotification>)
  || mongoose.model<INotification>('Notifications', NotificationSchema);
