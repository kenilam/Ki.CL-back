/**
 * Moves the database to one naming: snake_case plural collection names and
 * camelCase fields. Safe to run again: a collection already renamed is
 * skipped, and a field is only renamed where the old name is still there.
 *
 * Run (MONGODB_DATABASE picks the database, as for the server):
 *   npx tsx Server/Scripts/naming.ts
 */
import 'dotenv/config';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { Assets } from 'server/DataSources/MongoDB/Assets/Model.js';
import { ContactMessages } from 'server/DataSources/MongoDB/ContactMessages/Model.js';
import { ImageAgentJobs } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { KineticLightReadings } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { Locales } from 'server/DataSources/MongoDB/Locales/Model.js';
import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { PortfolioAccess } from 'server/DataSources/MongoDB/PortfolioAccess/Model.js';
import { Portfolios } from 'server/DataSources/MongoDB/Portfolios/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { Secrets } from 'server/DataSources/MongoDB/Secrets/Model.js';
import { TranslationRuns } from 'server/DataSources/MongoDB/TranslationRuns/Model.js';
import { Translations } from 'server/DataSources/MongoDB/Translations/Model.js';
import { TreeOfLifeNodes } from 'server/DataSources/MongoDB/TreeOfLife/Model.js';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';

const COLLECTIONS: [string, string][] = [
  ['contactmessages', 'contact_messages'],
  ['moonshot-reviews', 'moonshot_reviews'],
  ['passwordchanges', 'password_changes'],
  ['portfolio-access', 'portfolio_access'],
  ['portfolio', 'portfolios'],
  ['translation-runs', 'translation_runs'],
  ['tree-of-life', 'tree_of_life'],
  ['usertokens', 'user_tokens'],
];

const FIELDS: Record<string, string[]> = {
  users: ['UserGUID', 'UserName', 'Email', 'Password', 'FirstName', 'LastName', 'Active', 'Avatar'],
  user_tokens: ['UserGUID', 'Token', 'CreatedAt', 'LastSignedInAt', 'LastSignedOutAt'],
  registrations: ['RegistrationGUID', 'Secret', 'UserGUID'],
  password_changes: ['PasswordChangeGUID', 'UserGUID', 'Secret', 'Password', 'Confirmed', 'ExpiresAt'],
  contact_messages: ['ContactMessageGUID', 'UserGUID', 'Email', 'Message', 'ExpiresAt'],
  portfolios: ['PortfolioGUID', 'Path'],
  portfolio_access: ['PortfolioGUID', 'UserGUID'],
};

const MODELS = [
  Assets,
  ContactMessages,
  ImageAgentJobs,
  ImageAgentThreads,
  KineticLightReadings,
  Locales,
  PasswordChanges,
  PortfolioAccess,
  Portfolios,
  Registrations,
  Secrets,
  TranslationRuns,
  Translations,
  TreeOfLifeNodes,
  UserTokens,
  Users,
];

const camel = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

async function renameCollections(db: mongoose.mongo.Db): Promise<void> {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));

  for (const [from, to] of COLLECTIONS) {
    if (!names.has(from)) {
      continue;
    }

    if (names.has(to)) {
      if (await db.collection(to).estimatedDocumentCount()) {
        throw new Error(`Both ${from} and ${to} hold documents in ${db.databaseName}.`);
      }

      await db.collection(to).drop();
    }

    await db.collection(from).rename(to);
    console.log(`Renamed ${from} to ${to}.`);
  }
}

async function dropOldIndexes(db: mongoose.mongo.Db, collection: string, fields: string[]): Promise<void> {
  const old = [...fields, 'SocialProviders.Provider', 'SocialProviders.ProviderId'];

  for (const { key, name } of await db.collection(collection).indexes()) {
    if (name && Object.keys(key).some((field) => old.includes(field))) {
      await db.collection(collection).dropIndex(name);
      console.log(`${collection}: dropped ${name}.`);
    }
  }
}

async function renameFields(db: mongoose.mongo.Db): Promise<void> {
  for (const [collection, fields] of Object.entries(FIELDS)) {
    await dropOldIndexes(db, collection, fields);

    for (const field of fields) {
      const { modifiedCount } = await db
        .collection(collection)
        .updateMany({ [field]: { $exists: true } }, { $rename: { [field]: camel(field) } });

      if (modifiedCount) {
        console.log(`${collection}: ${field} to ${camel(field)} on ${modifiedCount} document(s).`);
      }
    }
  }

  const { modifiedCount } = await db.collection('users').updateMany({ SocialProviders: { $exists: true } }, [
    {
      $set: {
        socialProviders: {
          $map: {
            input: '$SocialProviders',
            as: 'entry',
            in: { provider: '$$entry.Provider', providerId: '$$entry.ProviderId', _id: '$$entry._id' },
          },
        },
      },
    },
    { $unset: 'SocialProviders' },
  ]);

  if (modifiedCount) {
    console.log(`users: SocialProviders to socialProviders on ${modifiedCount} document(s).`);
  }
}

async function run(): Promise<void> {
  mongoose.set('autoCreate', false);
  mongoose.set('autoIndex', false);
  await connectDatabase();
  const db = mongoose.connection.db!;

  await renameCollections(db);
  await renameFields(db);

  for (const model of MODELS) {
    const dropped = await model.syncIndexes();

    if (dropped.length) {
      console.log(`${model.collection.collectionName}: dropped ${dropped.join(', ')}.`);
    }
  }

  console.log(`Done (${db.databaseName}).`);
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
