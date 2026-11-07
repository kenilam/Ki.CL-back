import 'dotenv/config';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { KineticLightReadings } from 'server/DataSources/MongoDB/KineticLightReadings/Model.js';
import { Notifications } from 'server/DataSources/MongoDB/Notifications/Model.js';
import { notifyThread } from 'server/Modules/ImageAgent/notify.js';
import { toResult as toThread, type LeanImageAgentThread } from 'server/Modules/ImageAgent/types.js';
import { notifyReading } from 'server/Modules/KineticLight/notify.js';
import { toResult as toReading } from 'server/Modules/KineticLight/result.js';

const UNDISMISSED = { dismissedAt: { $type: 'null' } };

async function run(): Promise<void> {
  await connectDatabase();
  await Notifications.syncIndexes();

  const readings = await KineticLightReadings.collection
    .find<Parameters<typeof toReading>[0]>({ ...UNDISMISSED, ownerGUID: { $ne: null } })
    .toArray();
  const threads = await ImageAgentThreads.collection.find<LeanImageAgentThread>(UNDISMISSED).toArray();

  for (const reading of readings) {
    await notifyReading(toReading(reading));
  }

  for (const thread of threads) {
    await notifyThread(toThread(thread));
  }

  await KineticLightReadings.collection.updateMany({}, { $unset: { dismissedAt: '' } });
  await ImageAgentThreads.collection.updateMany({}, { $unset: { dismissedAt: '' } });

  console.log(
    `${readings.length} reading(s) and ${threads.length} thread(s) moved to notifications in ${mongoose.connection.name}.`,
  );
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
