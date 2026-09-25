/**
 * Seed script: Generate Ed25519 keypair and store in MongoDB Secrets collection.
 * Run: npx tsx Server/Scripts/seedCerts.ts
 */
import 'dotenv/config';
import { generateKeyPairSync } from 'node:crypto';
import { connectDatabase, mongoose } from 'server/DataSources/MongoDB/index.js';
import { CERT_KEYS } from 'server/Helpers/certs.js';
import { Secrets } from 'server/DataSources/MongoDB/Secrets/Model.js';

async function seed() {
  await connectDatabase();

  // Generate Ed25519 keypair
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Store as base64 in DB
  const privateKeyB64 = Buffer.from(privateKey).toString('base64');
  const publicKeyB64 = Buffer.from(publicKey).toString('base64');

  await Secrets.findOneAndUpdate(
    { key: CERT_KEYS.PRIVATE_KEY },
    { key: CERT_KEYS.PRIVATE_KEY, value: privateKeyB64 },
    { upsert: true },
  );
  console.log('✅ Private key stored');

  await Secrets.findOneAndUpdate(
    { key: CERT_KEYS.PUBLIC_KEY },
    { key: CERT_KEYS.PUBLIC_KEY, value: publicKeyB64 },
    { upsert: true },
  );
  console.log('✅ Public key stored');

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
