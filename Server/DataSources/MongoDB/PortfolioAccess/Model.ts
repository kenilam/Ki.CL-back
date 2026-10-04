import mongoose, { Schema, type Document } from 'mongoose';

/** One user's access to one portfolio piece. */
export interface IPortfolioAccess extends Document {
  PortfolioGUID: string;
  UserGUID: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioAccessSchema = new Schema<IPortfolioAccess>(
  {
    PortfolioGUID: {
      type: String,
      required: true,
      index: true,
    },
    UserGUID: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    collection: 'portfolio-access',
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// A user has access to a piece once.
PortfolioAccessSchema.index({ PortfolioGUID: 1, UserGUID: 1 }, { unique: true });

PortfolioAccessSchema.virtual('Portfolio', {
  ref: 'Portfolios',
  localField: 'PortfolioGUID',
  foreignField: 'PortfolioGUID',
  justOne: true,
});

PortfolioAccessSchema.virtual('User', {
  ref: 'Users',
  localField: 'UserGUID',
  foreignField: 'UserGUID',
  justOne: true,
});

export const PortfolioAccess = mongoose.models.PortfolioAccess as mongoose.Model<IPortfolioAccess> || mongoose.model<IPortfolioAccess>('PortfolioAccess', PortfolioAccessSchema);
