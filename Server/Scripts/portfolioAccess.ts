/**
 * Grants or revokes a user's access to a portfolio piece, or removes a piece
 * and everyone's access to it. Granting creates the piece in `portfolio` first
 * if it isn't there yet.
 *
 * Run (MONGODB_DATABASE picks test or production, as for the server):
 *   npx tsx Server/Scripts/portfolioAccess.ts grant moonshot someone@example.com
 *   npx tsx Server/Scripts/portfolioAccess.ts revoke moonshot someone@example.com
 *   npx tsx Server/Scripts/portfolioAccess.ts list moonshot
 *   npx tsx Server/Scripts/portfolioAccess.ts remove moonshot
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { PortfolioAccess } from 'server/DataSources/MongoDB/PortfolioAccess/Model.js';
import { usersOf } from 'server/DataSources/MongoDB/PortfolioAccess/relations.js';
import { Portfolios } from 'server/DataSources/MongoDB/Portfolios/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';

const USAGE = 'Usage: portfolioAccess.ts grant|revoke <path> <email> | list|remove <path>';

async function run(): Promise<void> {
  const [command, rawPath, email] = process.argv.slice(2);
  const path = rawPath?.trim().toLowerCase();

  if (!path || !['grant', 'revoke', 'list', 'remove'].includes(command ?? '')) {
    throw new Error(USAGE);
  }

  await connectDatabase();
  const database = mongoose.connection.name;

  if (command === 'list') {
    const portfolio = await Portfolios.findOne({ Path: path });
    const users = portfolio ? await usersOf(portfolio.PortfolioGUID) : [];

    console.log(`${path} in ${database}: ${users.map((user) => user.Email).join(', ') || 'nobody'}`);
    return;
  }

  if (command === 'remove') {
    const portfolio = await Portfolios.findOne({ Path: path });

    if (!portfolio) {
      console.log(`No ${path} in ${database}.`);
      return;
    }

    const { deletedCount } = await PortfolioAccess.deleteMany({ PortfolioGUID: portfolio.PortfolioGUID });
    await Portfolios.deleteOne({ PortfolioGUID: portfolio.PortfolioGUID });

    console.log(`Removed ${path} and ${deletedCount} access row(s) from ${database}.`);
    return;
  }

  if (!email) {
    throw new Error(USAGE);
  }

  const user = await Users.findOne({ Email: email.trim().toLowerCase() }, 'UserGUID Email');

  if (!user) {
    throw new Error(`No user ${email} in ${database}.`);
  }

  if (command === 'grant') {
    // The piece is created on its first grant.
    const portfolio = await Portfolios.findOneAndUpdate(
      { Path: path },
      { $setOnInsert: { PortfolioGUID: randomUUID(), Path: path } },
      { new: true, upsert: true },
    );

    await PortfolioAccess.updateOne(
      { PortfolioGUID: portfolio.PortfolioGUID, UserGUID: user.UserGUID },
      { $setOnInsert: { PortfolioGUID: portfolio.PortfolioGUID, UserGUID: user.UserGUID } },
      { upsert: true },
    );

    console.log(`${user.Email} can open ${path} (${database}).`);
    return;
  }

  const portfolio = await Portfolios.findOne({ Path: path });
  const { deletedCount } = portfolio
    ? await PortfolioAccess.deleteOne({ PortfolioGUID: portfolio.PortfolioGUID, UserGUID: user.UserGUID })
    : { deletedCount: 0 };

  console.log(
    deletedCount
      ? `${user.Email} can no longer open ${path} (${database}).`
      : `${user.Email} had no access to ${path} (${database}).`,
  );
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
