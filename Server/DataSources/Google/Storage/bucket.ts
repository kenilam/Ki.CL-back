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

/** Lazy bucket — server can boot without GCS; TaxonVisual throws when used. */
export function getBucket(): Bucket {
  if (bucketInstance) {
    return bucketInstance;
  }

  const serviceAccount = process.env.GOOGLE_STORAGE_SERVICE_ACCOUNT;
  const bucketId = process.env.GOOGLE_STORAGE_BUCKET_ID;

  if (!serviceAccount || !bucketId) {
    throw new Error(
      'Google Storage is not configured (GOOGLE_STORAGE_SERVICE_ACCOUNT / GOOGLE_STORAGE_BUCKET_ID)',
    );
  }

  ensureServiceAccountFile(serviceAccount);

  const client = new Storage({ keyFilename: SERVICE_ACCOUNT_PATH });
  bucketInstance = client.bucket(bucketId);
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
