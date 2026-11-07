import mongoose, { Schema, type Document } from 'mongoose';

/** One user's access to one portfolio piece. */
export interface IPortfolioAccess extends Document {
  portfolioGUID: string;
  userGUID: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioAccessSchema = new Schema<IPortfolioAccess>(
  {
    portfolioGUID: {
      type: String,
      required: true,
      index: true,
    },
    userGUID: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    collection: 'portfolio_access',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// A user has access to a piece once.
PortfolioAccessSchema.index({ portfolioGUID: 1, userGUID: 1 }, { unique: true });

PortfolioAccessSchema.virtual('portfolio', {
  ref: 'Portfolios',
  localField: 'portfolioGUID',
  foreignField: 'portfolioGUID',
  justOne: true,
});

PortfolioAccessSchema.virtual('user', {
  ref: 'Users',
  localField: 'userGUID',
  foreignField: 'userGUID',
  justOne: true,
});

export const PortfolioAccess = mongoose.models.PortfolioAccess as mongoose.Model<IPortfolioAccess> || mongoose.model<IPortfolioAccess>('PortfolioAccess', PortfolioAccessSchema);
