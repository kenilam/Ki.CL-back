import type { NextFunction, Request, Response } from 'express';

import { getBucket, getBucketId } from './bucket.js';

/**
 * Authenticated same-origin asset proxy.
 * Maps `/assets/{bucketId}/{object}` → GCS object via the service account
 * (anonymous googleapis fetches fail on private buckets).
 */
export function createGoogleStorageAssetHandler() {
  const bucketId = process.env.GOOGLE_STORAGE_BUCKET_ID;

  return async function googleStorageAssetHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!bucketId) {
        res.status(503).end();
        return;
      }

      // Mounted at GOOGLE_STORAGE_PROXY (`/assets`) → path is `/taxon-visual/…`
      const relative = (req.path || '').replace(/^\//, '');
      const prefix = `${bucketId}/`;
      if (!relative.startsWith(prefix)) {
        res.status(404).end();
        return;
      }

      const objectName = relative.slice(prefix.length);
      if (!objectName || objectName.includes('..')) {
        res.status(400).end();
        return;
      }

      const file = getBucket().file(objectName);
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).end();
        return;
      }

      const [meta] = await file.getMetadata();
      res.setHeader(
        'Content-Type',
        String(meta.contentType || 'application/octet-stream'),
      );
      res.setHeader(
        'Cache-Control',
        String(meta.cacheControl || 'public, max-age=31536000, immutable'),
      );
      if (meta.size) {
        res.setHeader('Content-Length', String(meta.size));
      }

      file
        .createReadStream()
        .on('error', (error) => {
          if (!res.headersSent) {
            res.status(502);
          }
          next(error);
        })
        .pipe(res);
    } catch (error) {
      next(error);
    }
  };
}

export { getBucketId };
