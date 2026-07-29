import { getBucket, publicObjectPath } from './bucket.js';

type UploadBufferOptions = {
  buffer: Buffer;
  objectName: string;
  contentType?: string;
  cacheControl?: string;
};

/**
 * Upload a raw buffer to the configured GCS bucket.
 * Returns the proxied public path (not a raw googleapis URL).
 */
export async function uploadBuffer({
  buffer,
  objectName,
  contentType = 'image/png',
  cacheControl = 'public, max-age=31536000, immutable',
}: UploadBufferOptions): Promise<{ path: string }> {
  const file = getBucket().file(objectName);

  await file.save(buffer, {
    resumable: false,
    contentType,
    metadata: { cacheControl },
  });

  return { path: publicObjectPath(objectName) };
}

export async function objectExists(objectName: string): Promise<boolean> {
  const [exists] = await getBucket().file(objectName).exists();
  return exists;
}
