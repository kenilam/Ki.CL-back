import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A piece under Ki.CL's `/portfolio`, named by its path segment (`moonshot`,
 * `pika`). Who may open it is in `portfolio-access`.
 */
export interface IPortfolio extends Document {
  PortfolioGUID: string;
  Path: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolio>(
  {
    PortfolioGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    Path: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    collection: 'portfolio',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/** This piece's access rows. `usersOf()` follows them to the users. */
PortfolioSchema.virtual('Access', {
  ref: 'PortfolioAccess',
  localField: 'PortfolioGUID',
  foreignField: 'PortfolioGUID',
});

export const Portfolios = mongoose.models.Portfolios as mongoose.Model<IPortfolio> || mongoose.model<IPortfolio>('Portfolios', PortfolioSchema);
