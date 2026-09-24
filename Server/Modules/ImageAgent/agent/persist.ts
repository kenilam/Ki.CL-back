import { createHash } from 'node:crypto';

import { Storage } from 'server/DataSources/Google/index.js';
import { Assets } from 'server/DataSources/MongoDB/Assets/Model.js';
import { imageContentType, imageExtension } from 'server/Helpers/imageFormat.js';
import type { GeneratedImage } from 'server/Modules/TaxonVisual/providers/image/types.js';

/** Agent output sits under its own prefix in the pipeline bucket. */
const OBJECT_PREFIX = 'agent/';

export type PersistedImage = {
  assetId: string;
  url: string;
  generator: string;
};

/**
 * Content-addressed like the taxon plates, so the immutable cache header the
 * proxy sends stays true: new bytes get a new URL.
 */
function objectName(jobId: string, buffer: Buffer): string {
  const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  return `${OBJECT_PREFIX}${jobId}-${digest}.${imageExtension(buffer)}`;
}

export async function persistImage(
  jobId: string,
  image: GeneratedImage,
): Promise<PersistedImage> {
  const { path } = await Storage.uploadBuffer({
    buffer: image.buffer,
    objectName: objectName(jobId, image.buffer),
    contentType: imageContentType(image.buffer),
  });

  const asset = await Assets.create({
    url: path,
    generator: image.generator,
  });

  return {
    assetId: String(asset._id),
    url: path,
    generator: image.generator,
  };
}
