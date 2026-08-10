import type { NextFunction, Request, Response } from 'express';

import { getBucketForSegment, getBucketId } from './bucket.js';

/**
 * Authenticated same-origin asset proxy.
 * Maps `/assets/{segment}/{object}` → GCS object via the service account
 * (anonymous googleapis fetches fail on private buckets).
 *
 * The first path segment selects the bucket rather than naming it — see
 * `bucket.ts` for why the two are kept apart. Today that is `taxon-visual`
 * for generated plates and `static` for the site's own imagery.
 */
export function createGoogleStorageAssetHandler() {
  return async function googleStorageAssetHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Mounted at GOOGLE_STORAGE_PROXY (`/assets`) → path is `/{segment}/…`
      const relative = (req.path || '').replace(/^\//, '');
      const separator = relative.indexOf('/');

      if (separator < 1) {
        res.status(404).end();
        return;
      }

      const segment = relative.slice(0, separator);
      const objectName = relative.slice(separator + 1);

      const bucket = getBucketForSegment(segment);

      if (!bucket) {
        // Either an unknown segment or one this environment has no bucket for.
        res.status(404).end();
        return;
      }

      if (!objectName || objectName.includes('..')) {
        res.status(400).end();
        return;
      }

      const file = bucket.file(objectName);
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
