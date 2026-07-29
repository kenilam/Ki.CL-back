import mongoose, { Schema, type Document } from 'mongoose';

export interface IUserToken extends Document {
  UserGUID: string;
  Token: string;
  CreatedAt: Date;
  LastSignedInAt: Date;
  LastSignedOutAt?: Date;
}

const UserTokenSchema = new Schema<IUserToken>(
  {
    UserGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    Token: {
      type: String,
      required: true,
      unique: true,
    },
    CreatedAt: {
      type: Date,
      default: () => new Date(),
    },
    LastSignedInAt: {
      type: Date,
      default: () => new Date(),
    },
    LastSignedOutAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
  },
);

export const UserTokens = mongoose.models.UserTokens as mongoose.Model<IUserToken> || mongoose.model<IUserToken>('UserTokens', UserTokenSchema);
