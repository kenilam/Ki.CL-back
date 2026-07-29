import mongoose, { Schema, type Document } from 'mongoose';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';

export interface IUser extends Document {
  UserGUID: string;
  UserName: string;
  Email: string;
  Password: string;
  FirstName?: string | null;
  LastName?: string | null;
  Active: boolean;
  Avatar?: string | null;
  SocialProviders: Array<{
    Provider: string;
    ProviderId: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    UserGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    UserName: {
      type: String,
      required: true,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    Password: {
      type: String,
      required: true,
    },
    FirstName: {
      type: String,
      default: null,
    },
    LastName: {
      type: String,
      default: null,
    },
    Active: {
      type: Boolean,
      default: false,
    },
    Avatar: {
      type: String,
      default: null,
    },
    SocialProviders: [
      {
        Provider: { type: String, required: true },
        ProviderId: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

UserSchema.pre('validate', async function () {
  if (!this.UserName) {
    this.UserName = this.Email;
  }

  if (this.isModified('Password')) {
    const { hash } = await generatePassword({ password: this.Password });
    this.Password = hash;
  }
});

export const Users = mongoose.models.Users as mongoose.Model<IUser> || mongoose.model<IUser>('Users', UserSchema);
