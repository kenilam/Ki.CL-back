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

type ByteRange = { end: number; start: number };

/**
 * The one range a `Range` header asks for: `null` when there is no header or
 * it asks for several, which gets the whole file, and `false` when the range
 * lies outside the file.
 */
function parseRange(
  header: string | undefined,
  size: number,
): ByteRange | false | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '');

  if (!match || (!match[1] && !match[2])) {
    return null;
  }

  // `bytes=-500` is the last 500 bytes.
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2]
    ? Math.min(Number(match[2]), size - 1)
    : size - 1;

  return start > end || start >= size ? false : { end, start };
}

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

      /*
       * Safari will not play audio or video from a server that ignores `Range`:
       * it asks for the first two bytes, and a 200 with the whole file fails
       * the element.
       */
      const size = Number(meta.size);
      const range = size ? parseRange(req.headers.range, size) : null;

      if (size) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      if (range === false) {
        res.setHeader('Content-Range', `bytes */${size}`);
        res.status(416).end();
        return;
      }

      if (range) {
        res.status(206);
        res.setHeader(
          'Content-Range',
          `bytes ${range.start}-${range.end}/${size}`,
        );
        res.setHeader('Content-Length', String(range.end - range.start + 1));
      } else if (size) {
        res.setHeader('Content-Length', String(size));
      }

      file
        .createReadStream(range ?? undefined)
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
