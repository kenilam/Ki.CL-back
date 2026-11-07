import mongoose, { Schema, type Document } from 'mongoose';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';

export interface IRegistration extends Document {
  registrationGUID: string;
  secret: string;
  userGUID: string;
  createdAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    registrationGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
    },
    userGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'registrations',
  },
);

RegistrationSchema.pre('validate', async function () {
  if (this.isModified('secret')) {
    const { hash } = await generatePassword({ password: this.secret });
    this.secret = hash;
  }
});

export const Registrations = mongoose.models.Registrations as mongoose.Model<IRegistration> || mongoose.model<IRegistration>('Registrations', RegistrationSchema);
