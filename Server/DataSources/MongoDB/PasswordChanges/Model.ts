import mongoose, { Schema, type Document } from 'mongoose';

export interface IPasswordChange extends Document {
  passwordChangeGUID: string;
  userGUID: string;
  /** SHA-256 of the secret in the emailed link. The secret itself is not kept. */
  secret: string;
  /** The new password, already hashed the way `Users.password` is. */
  password: string;
  confirmed: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const PasswordChangeSchema = new Schema<IPasswordChange>(
  {
    passwordChangeGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // One request per user: asking again replaces the last one.
    userGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'password_changes',
  },
);

// Mongo removes a request once it has expired. Readers check ExpiresAt too, since removal can lag a minute.
PasswordChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordChanges = mongoose.models.PasswordChanges as mongoose.Model<IPasswordChange> || mongoose.model<IPasswordChange>('PasswordChanges', PasswordChangeSchema);
