import mongoose, { Schema, type Document } from 'mongoose';

/**
 * A piece under Ki.CL's `/portfolio`, named by its path segment, like
 * `moonshot`. Who may open it is in `portfolio-access`.
 */
export interface IPortfolio extends Document {
  portfolioGUID: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolio>(
  {
    portfolioGUID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    collection: 'portfolios',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/** This piece's access rows. `usersOf()` follows them to the users. */
PortfolioSchema.virtual('access', {
  ref: 'PortfolioAccess',
  localField: 'portfolioGUID',
  foreignField: 'portfolioGUID',
});

export const Portfolios = mongoose.models.Portfolios as mongoose.Model<IPortfolio> || mongoose.model<IPortfolio>('Portfolios', PortfolioSchema);
