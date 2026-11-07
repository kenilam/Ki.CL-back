import mongoose, { Schema, type Document } from 'mongoose';

export interface IUserToken extends Document {
  userGUID: string;
  token: string;
  createdAt: Date;
  lastSignedInAt: Date;
  lastSignedOutAt?: Date;
}

const UserTokenSchema = new Schema<IUserToken>(
  {
    userGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
    lastSignedInAt: {
      type: Date,
      default: () => new Date(),
    },
    lastSignedOutAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    collection: 'user_tokens',
  },
);

export const UserTokens = mongoose.models.UserTokens as mongoose.Model<IUserToken> || mongoose.model<IUserToken>('UserTokens', UserTokenSchema);
