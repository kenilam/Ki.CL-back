import mongoose, { Schema, type Document } from 'mongoose';

export interface IContactMessage extends Document {
  contactMessageGUID: string;
  /** The session that sent it. The limits count by this. */
  userGUID: string;
  /** The address the sender asked to be answered at, lower case. */
  email: string;
  message: string;
  expiresAt: Date;
  createdAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    contactMessageGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userGUID: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'contact_messages',
  },
);

// Mongo removes a message once its retention has passed. The privacy line on the form states the period.
ContactMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ContactMessages = mongoose.models.ContactMessages as mongoose.Model<IContactMessage> || mongoose.model<IContactMessage>('ContactMessages', ContactMessageSchema);
