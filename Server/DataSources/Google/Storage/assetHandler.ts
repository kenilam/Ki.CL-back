import type { NextFunction, Request, Response } from 'express';

import { getBucketForSegment, getBucketId } from './bucket.js';

/**
 * Authenticated same-origin asset proxy.
 * Maps `/assets/{segment}/{object}` → GCS object via the service account
 * (anonymous googleapis fetches fail on private buckets).
 *
 * The first path segment selects the bucket rather than naming it - see
 * `bucket.ts` for why the two are kept apart. Today that is `taxon-visual`
 * for generated plates and `static` for the site's own imagery.
 */

/**
 * What to send when an object carries no `cacheControl` of its own.
 *
 * The two buckets want opposite answers. A generated plate is named after its
 * contents, so its bytes never change and it can be cached forever. A file in
 * `static` is named after what it is - `banner.dark.webp` stays that whatever
 * is re-encoded into it - so the same URL has to be able to return something
 * new. Freezing it for a year would strand a replacement behind every cache
 * that had already seen it.
 *
 * Revalidating is not the same as not caching: the response still carries an
 * ETag, so an unchanged file costs a 304 and no body.
 */
const CACHE_CONTROL: Record<string, string> = {
  'taxon-visual': 'public, max-age=31536000, immutable',
  static: 'public, max-age=0, must-revalidate',
};

const DEFAULT_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
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

      /*
       * Forwarded so revalidation costs a header exchange rather than the
       * file. Without this a `must-revalidate` asset is re-sent in full on
       * every page load, which is worse than not caching it at all.
       */
      const etag = meta.etag ? String(meta.etag) : null;

      if (etag) {
        res.setHeader('ETag', etag);

        if (req.headers['if-none-match'] === etag) {
          res.status(304).end();
          return;
        }
      }

      res.setHeader(
        'Content-Type',
        String(meta.contentType || 'application/octet-stream'),
      );
      res.setHeader(
        'Cache-Control',
        String(
          meta.cacheControl
            || CACHE_CONTROL[segment]
            || DEFAULT_CACHE_CONTROL,
        ),
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
