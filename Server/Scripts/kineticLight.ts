/**
 * Brings Kinetic Light songs to the current shape, and turns songs into
 * examples every visitor can play.
 *
 * Run (MONGODB_DATABASE picks the database, as for the server):
 *   npx tsx Server/Scripts/kineticLight.ts migrate
 *   npx tsx Server/Scripts/kineticLight.ts examples <id> [<id> ...]
 *
 * `migrate` titles a song from its file name when it has no title, drops the
 * file name, removes it 30 days after it was made, and syncs the indexes,
 * which drops the old TTL index on `createdAt`. `examples` takes songs off
 * their owner, marks them seen and keeps them for 99 years.
 */
import 'dotenv/config';
import { Types } from 'mongoose';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { KineticLightReadings } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { KineticLightStatus } from 'server/Types/graphql.js';

const USAGE = 'Usage: kineticLight.ts migrate | examples <id> [<id> ...]';
const EXTENSION = /\.[a-z0-9]+$/i;
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const EXAMPLE_YEARS = 99;

async function migrate(database: string): Promise<void> {
  const readings = KineticLightReadings.collection;
  const outdated = readings.find({ $or: [{ name: { $exists: true } }, { expiresAt: { $exists: false } }] });
  let count = 0;

  for await (const reading of outdated) {
    const name = typeof reading.name === 'string' ? reading.name : '';

    await readings.updateOne(
      { _id: reading._id },
      {
        $set: {
          title: reading.title ?? (name.replace(EXTENSION, '') || name),
          expiresAt: reading.expiresAt ?? new Date(reading.createdAt.getTime() + KEEP_MS),
          example: reading.example ?? false,
        },
        $unset: { name: '' },
      },
    );
    count += 1;
  }

  const dropped = await KineticLightReadings.syncIndexes();

  console.log(`Moved ${count} song(s) in ${database}. Dropped indexes: ${dropped.join(', ') || 'none'}.`);
}

async function examples(database: string, ids: string[]): Promise<void> {
  if (!ids.length || !ids.every((id) => Types.ObjectId.isValid(id))) {
    throw new Error(USAGE);
  }

  const until = new Date();

  until.setFullYear(until.getFullYear() + EXAMPLE_YEARS);

  const { modifiedCount } = await KineticLightReadings.collection.updateMany(
    { _id: { $in: ids.map((id) => new Types.ObjectId(id)) }, status: KineticLightStatus.Ready },
    [
      {
        $set: {
          example: true,
          ownerGUID: null,
          expiresAt: until,
          dismissedAt: { $ifNull: ['$dismissedAt', '$$NOW'] },
        },
      },
    ],
  );

  console.log(`${modifiedCount} of ${ids.length} song(s) are examples in ${database}, kept until ${until.toISOString()}.`);
}

async function run(): Promise<void> {
  const [command, ...ids] = process.argv.slice(2);

  if (!['migrate', 'examples'].includes(command ?? '')) {
    throw new Error(USAGE);
  }

  await connectDatabase();
  const database = mongoose.connection.name;

  if (command === 'migrate') {
    await migrate(database);
    return;
  }

  await examples(database, ids);
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
