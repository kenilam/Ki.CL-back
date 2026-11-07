import mongoose, { Schema, type Document } from 'mongoose';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';

export interface IUser extends Document {
  userGUID: string;
  userName: string;
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
  active: boolean;
  avatar?: string | null;
  socialProviders: Array<{
    provider: string;
    providerId: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    socialProviders: [
      {
        provider: { type: String, required: true },
        providerId: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/** This user's portfolio access rows. `portfoliosOf()` follows them to the pieces. */
UserSchema.virtual('access', {
  ref: 'PortfolioAccess',
  localField: 'userGUID',
  foreignField: 'userGUID',
});

UserSchema.pre('validate', async function () {
  if (!this.userName) {
    this.userName = this.email;
  }

  if (this.isModified('password')) {
    const { hash } = await generatePassword({ password: this.password });
    this.password = hash;
  }
});

export const Users = mongoose.models.Users as mongoose.Model<IUser> || mongoose.model<IUser>('Users', UserSchema);
