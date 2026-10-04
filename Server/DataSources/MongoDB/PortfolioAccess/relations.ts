import { Portfolios, type IPortfolio } from 'server/DataSources/MongoDB/Portfolios/Model.js';
import { Users, type IUser } from 'server/DataSources/MongoDB/Users/Model.js';
import { PortfolioAccess } from './Model.js';

/*
 * Users and portfolios meet in `portfolio-access`, one row per user and
 * piece. These follow that table both ways.
 */

/** The pieces a user may open. */
export async function portfoliosOf(UserGUID: string): Promise<IPortfolio[]> {
  const rows = await PortfolioAccess.find({ UserGUID }, 'PortfolioGUID');

  return Portfolios.find({ PortfolioGUID: { $in: rows.map((row) => row.PortfolioGUID) } });
}

/** The users who may open a piece, without their passwords. */
export async function usersOf(PortfolioGUID: string): Promise<IUser[]> {
  const rows = await PortfolioAccess.find({ PortfolioGUID }, 'UserGUID');

  return Users.find({ UserGUID: { $in: rows.map((row) => row.UserGUID) } }, '-Password');
}

/** Whether a user may open the piece at `Path`. */
export async function hasPortfolioAccess(UserGUID: string, Path: string): Promise<boolean> {
  const portfolio = await Portfolios.findOne({ Path: Path.toLowerCase() }, 'PortfolioGUID');

  if (!portfolio) {
    return false;
  }

  return Boolean(await PortfolioAccess.exists({ PortfolioGUID: portfolio.PortfolioGUID, UserGUID }));
}
