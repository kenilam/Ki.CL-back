import { Secrets } from 'server/DataSources/MongoDB/Secrets/Model.js';

export const CERT_KEYS = {
  PRIVATE_KEY: 'ed25519_private_key',
  PUBLIC_KEY: 'ed25519_public_key',
} as const;

let privateKey: Buffer | null = null;
let publicKey: Buffer | null = null;

/**
 * Load Ed25519 certs from DB into memory. Called once on server startup.
 */
export async function loadCerts(): Promise<void> {
  const [privRecord, pubRecord] = await Promise.all([
    Secrets.findOne({ key: CERT_KEYS.PRIVATE_KEY }),
    Secrets.findOne({ key: CERT_KEYS.PUBLIC_KEY }),
  ]);

  if (privRecord?.value) {
    privateKey = Buffer.from(privRecord.value, 'base64');
    console.log('✅ Ed25519 private key loaded from DB');
  } else {
    console.warn('⚠️  Ed25519 private key not found in DB (Secrets collection, key: ed25519_private_key)');
  }

  if (pubRecord?.value) {
    publicKey = Buffer.from(pubRecord.value, 'base64');
    console.log('✅ Ed25519 public key loaded from DB');
  } else {
    console.warn('⚠️  Ed25519 public key not found in DB (Secrets collection, key: ed25519_public_key)');
  }
}

export function getPrivateKey(): Buffer | null {
  return privateKey;
}

export function getPublicKey(): Buffer | null {
  return publicKey;
}
