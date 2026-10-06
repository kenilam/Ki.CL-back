import mongoose, { Schema, type Document } from 'mongoose';

export interface IPasswordChange extends Document {
  PasswordChangeGUID: string;
  UserGUID: string;
  /** SHA-256 of the secret in the emailed link. The secret itself is not kept. */
  Secret: string;
  /** The new password, already hashed the way `Users.Password` is. */
  Password: string;
  Confirmed: boolean;
  ExpiresAt: Date;
  createdAt: Date;
}

const PasswordChangeSchema = new Schema<IPasswordChange>(
  {
    PasswordChangeGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // One request per user: asking again replaces the last one.
    UserGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    Secret: {
      type: String,
      required: true,
    },
    Password: {
      type: String,
      required: true,
    },
    Confirmed: {
      type: Boolean,
      default: false,
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

// Mongo removes a request once it has expired. Readers check ExpiresAt too, since removal can lag a minute.
PasswordChangeSchema.index({ ExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordChanges = mongoose.models.PasswordChanges as mongoose.Model<IPasswordChange> || mongoose.model<IPasswordChange>('PasswordChanges', PasswordChangeSchema);
