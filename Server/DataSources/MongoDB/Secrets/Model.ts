import mongoose, { Schema, type Document } from 'mongoose';

export interface ISecret extends Document {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const SecretSchema = new Schema<ISecret>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Secrets = mongoose.models.Secrets as mongoose.Model<ISecret> || mongoose.model<ISecret>('Secrets', SecretSchema);
