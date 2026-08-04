import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import appRoot from 'app-root-path';
import { Storage, type Bucket } from '@google-cloud/storage';

const SECRET_DIRECTORY = appRoot.resolve('Server/.secret');
const SERVICE_ACCOUNT_FILENAME = 'google.storage.service.account.json';
const SERVICE_ACCOUNT_PATH = `${SECRET_DIRECTORY}/${SERVICE_ACCOUNT_FILENAME}`;

let bucketInstance: Bucket | null = null;

function ensureServiceAccountFile(serviceAccount: string) {
  if (!existsSync(SECRET_DIRECTORY)) {
    mkdirSync(SECRET_DIRECTORY, { recursive: true });
  }
  // Always refresh so rotated keys from .env take effect on restart
  writeFileSync(SERVICE_ACCOUNT_PATH, serviceAccount);
}

/**
 * Lazy bucket — server can boot without GCS; TaxonVisual throws when used.
 *
 * Credentials come from the environment the server is running in whenever it
 * can supply them: on Cloud Run that is the service account the service runs
 * as, and locally it is whatever `gcloud auth application-default login` left
 * behind. Neither is a file this process has to hold.
 *
 * An explicit key is still honoured, because somewhere without a Google
 * identity has no other way in. It is the fallback rather than the requirement
 * it used to be — a private key in an environment variable, rewritten to disk
 * on every boot, is a durable credential in two more places than it needs to
 * be, and this repository has already had one such key leak into its history.
 */
export function getBucket(): Bucket {
  if (bucketInstance) {
    return bucketInstance;
  }

  const serviceAccount = process.env.GOOGLE_STORAGE_SERVICE_ACCOUNT;
  const bucketId = process.env.GOOGLE_STORAGE_BUCKET_ID;

  if (!bucketId) {
    throw new Error('Google Storage is not configured (GOOGLE_STORAGE_BUCKET_ID)');
  }

  if (serviceAccount) {
    ensureServiceAccountFile(serviceAccount);

    bucketInstance = new Storage({ keyFilename: SERVICE_ACCOUNT_PATH })
      .bucket(bucketId);

    return bucketInstance;
  }

  // Application Default Credentials: the runtime's own identity.
  bucketInstance = new Storage().bucket(bucketId);

  return bucketInstance;
}

export function getBucketId(): string {
  const bucketId = process.env.GOOGLE_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error('GOOGLE_STORAGE_BUCKET_ID is not configured');
  }
  return bucketId;
}

export function getStorageProxyPrefix(): string {
  return process.env.GOOGLE_STORAGE_PROXY || '/assets';
}

/** Same-origin path served via the Storage proxy, e.g. `/assets/taxon-visual/123.png`. */
export function publicObjectPath(objectName: string): string {
  const proxy = getStorageProxyPrefix().replace(/\/$/, '');
  return `${proxy}/${getBucketId()}/${objectName.replace(/^\//, '')}`;
}
