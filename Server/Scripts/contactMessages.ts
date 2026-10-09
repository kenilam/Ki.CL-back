/**
 * Deletes the contact form messages kept under an address, for when someone
 * asks for theirs to be removed. Messages are removed by Mongo anyway once
 * their retention has passed.
 *
 * Run (MONGODB_DATABASE picks test or production, as for the server):
 *   npx tsx Server/Scripts/contactMessages.ts forget someone@example.com
 */
import 'dotenv/config';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { ContactMessages } from 'server/DataSources/MongoDB/ContactMessages/Model.js';

const USAGE = 'Usage: contactMessages.ts forget <email>';

async function run(): Promise<void> {
  const [command, rawEmail] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();

  if (command !== 'forget' || !email) {
    throw new Error(USAGE);
  }

  await connectDatabase();

  const { deletedCount } = await ContactMessages.deleteMany({ Email: email });

  console.log(`${deletedCount} message(s) from ${email} deleted (${mongoose.connection.name}).`);
}

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
