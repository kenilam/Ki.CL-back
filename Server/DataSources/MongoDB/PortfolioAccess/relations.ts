import { Portfolios, type IPortfolio } from 'server/DataSources/MongoDB/Portfolios/Model.js';
import { Users, type IUser } from 'server/DataSources/MongoDB/Users/Model.js';
import { PortfolioAccess } from './Model.js';

/*
 * Users and portfolios meet in `portfolio-access`, one row per user and
 * piece. These follow that table both ways.
 */

/** The pieces a user may open. */
export async function portfoliosOf(userGUID: string): Promise<IPortfolio[]> {
  const rows = await PortfolioAccess.find({ userGUID }, 'portfolioGUID');

  return Portfolios.find({ portfolioGUID: { $in: rows.map((row) => row.portfolioGUID) } });
}

/** The users who may open a piece, without their passwords. */
export async function usersOf(portfolioGUID: string): Promise<IUser[]> {
  const rows = await PortfolioAccess.find({ portfolioGUID }, 'userGUID');

  return Users.find({ userGUID: { $in: rows.map((row) => row.userGUID) } }, '-password');
}

/** Whether a user may open the piece at `path`. */
export async function hasPortfolioAccess(userGUID: string, path: string): Promise<boolean> {
  const portfolio = await Portfolios.findOne({ path: path.toLowerCase() }, 'portfolioGUID');

  if (!portfolio) {
    return false;
  }

  return Boolean(await PortfolioAccess.exists({ portfolioGUID: portfolio.portfolioGUID, userGUID }));
}
