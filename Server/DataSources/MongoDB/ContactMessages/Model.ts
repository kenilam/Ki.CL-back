import mongoose, { Schema, type Document } from 'mongoose';

export interface IContactMessage extends Document {
  ContactMessageGUID: string;
  /** The session that sent it. The limits count by this. */
  UserGUID: string;
  /** The address the sender asked to be answered at, lower case. */
  Email: string;
  Message: string;
  ExpiresAt: Date;
  createdAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    ContactMessageGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    UserGUID: {
      type: String,
      required: true,
      index: true,
    },
    Email: {
      type: String,
      required: true,
      index: true,
    },
    Message: {
      type: String,
      required: true,
    },
    ExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Mongo removes a message once its retention has passed. The privacy line on the form states the period.
ContactMessageSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const ContactMessages = mongoose.models.ContactMessages as mongoose.Model<IContactMessage> || mongoose.model<IContactMessage>('ContactMessages', ContactMessageSchema);
