import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import appRoot from 'app-root-path';
import { Storage, type Bucket } from '@google-cloud/storage';

const SECRET_DIRECTORY = appRoot.resolve('Server/.secret');
const SERVICE_ACCOUNT_FILENAME = 'google.storage.service.account.json';
const SERVICE_ACCOUNT_PATH = `${SECRET_DIRECTORY}/${SERVICE_ACCOUNT_FILENAME}`;

let storageInstance: Storage | null = null;
const bucketInstances = new Map<string, Bucket>();

function ensureServiceAccountFile(serviceAccount: string) {
  if (!existsSync(SECRET_DIRECTORY)) {
    mkdirSync(SECRET_DIRECTORY, { recursive: true });
  }
  // Always refresh so rotated keys from .env take effect on restart
  writeFileSync(SERVICE_ACCOUNT_PATH, serviceAccount);
}

/**
 * Lazy client - server can boot without GCS; the callers throw when used.
 *
 * Credentials come from the environment the server is running in whenever it
 * can supply them: on Cloud Run that is the service account the service runs
 * as, and locally it is whatever `gcloud auth application-default login` left
 * behind. Neither is a file this process has to hold.
 *
 * An explicit key is still honoured, because somewhere without a Google
 * identity has no other way in. It is the fallback rather than the requirement
 * it used to be - a private key in an environment variable, rewritten to disk
 * on every boot, is a durable credential in two more places than it needs to
 * be, and this repository has already had one such key leak into its history.
 */
function getStorage(): Storage {
  if (storageInstance) {
    return storageInstance;
  }

  const serviceAccount = process.env.GOOGLE_STORAGE_SERVICE_ACCOUNT;

  storageInstance = serviceAccount
    ? (ensureServiceAccountFile(serviceAccount),
      new Storage({ keyFilename: SERVICE_ACCOUNT_PATH }))
    : // Application Default Credentials: the runtime's own identity.
      new Storage();

  return storageInstance;
}

/**
 * The URL segment each bucket answers to, and the bucket behind it.
 *
 * The segment is deliberately not the bucket name. Bucket names are unique
 * across the whole of Google Cloud, so the one you want is rarely the one you
 * can have - `static` was already taken - and a URL that has been written into
 * the database should not have to change because of that. Keeping the mapping
 * here means the public path stays `/assets/static/…` whatever the bucket
 * underneath ends up being called.
 *
 * `taxon-visual` is the pipeline's output, written at runtime. `static` is the
 * site's own imagery, uploaded at deploy time so it need not be committed.
 */
const BUCKET_SEGMENTS: Record<string, string | undefined> = {
  'taxon-visual': process.env.GOOGLE_STORAGE_BUCKET_ID,
  static: process.env.GOOGLE_STORAGE_STATIC_BUCKET_ID,
};

/** Bucket ids by URL segment, skipping any the environment has not configured. */
export function getBucketSegments(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(BUCKET_SEGMENTS).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  );
}

/** The bucket a URL segment maps to, or null when it is not one of ours. */
export function getBucketForSegment(segment: string): Bucket | null {
  const bucketId = getBucketSegments()[segment];

  if (!bucketId) {
    return null;
  }

  const cached = bucketInstances.get(bucketId);

  if (cached) {
    return cached;
  }

  const bucket = getStorage().bucket(bucketId);
  bucketInstances.set(bucketId, bucket);

  return bucket;
}

/** The pipeline's bucket - the one it writes generated plates into. */
export function getBucket(): Bucket {
  const bucket = getBucketForSegment('taxon-visual');

  if (!bucket) {
    throw new Error(
      'Google Storage is not configured (GOOGLE_STORAGE_BUCKET_ID)',
    );
  }

  return bucket;
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

/**
 * Same-origin path served via the Storage proxy, e.g.
 * `/assets/taxon-visual/123.png`.
 *
 * The segment stays `taxon-visual` rather than the bucket id, so the paths
 * already written to the database keep resolving even if the bucket is
 * renamed or replaced.
 */
export function publicObjectPath(objectName: string): string {
  const proxy = getStorageProxyPrefix().replace(/\/$/, '');
  return `${proxy}/taxon-visual/${objectName.replace(/^\//, '')}`;
}
