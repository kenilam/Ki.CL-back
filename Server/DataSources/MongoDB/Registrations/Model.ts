import mongoose, { Schema, type Document } from 'mongoose';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';

export interface IRegistration extends Document {
  RegistrationGUID: string;
  Secret: string;
  UserGUID: string;
  createdAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    RegistrationGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    Secret: {
      type: String,
      required: true,
    },
    UserGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

RegistrationSchema.pre('validate', async function () {
  if (this.isModified('Secret')) {
    const { hash } = await generatePassword({ password: this.Secret });
    this.Secret = hash;
  }
});

export const Registrations = mongoose.models.Registrations as mongoose.Model<IRegistration> || mongoose.model<IRegistration>('Registrations', RegistrationSchema);
