import { createHash } from 'node:crypto';

import { Storage } from 'server/DataSources/Google/index.js';
import { Assets } from 'server/DataSources/MongoDB/Assets/Model.js';
import { runProviderFailover } from './providers/failover.js';
import {
  buildImageProviders,
  type BuildImageProviderOptions,
} from './providers/image/index.js';
import type { GeneratedImage } from './providers/image/types.js';

/**
 * Every render of one taxon shares this prefix; the digest after it is what
 * tells two renders apart.
 */
export function taxonVisualObjectPrefix(ottId: number): string {
  return `${ottId}-`;
}

/**
 * Object name from the bytes themselves.
 *
 * The name used to be `${ottId}.png`, so every regeneration of a taxon wrote a
 * different picture to the same URL — while the proxy served it with
 * `immutable, max-age=31536000`. Anyone who had seen the old plate kept seeing
 * it forever, and a regenerated image simply never reached them.
 *
 * Naming the object after a digest of its contents makes that header true
 * instead of a promise the URL cannot keep: identical bytes resolve to one
 * name, new bytes to a new one, and a fresh render arrives as a URL no cache
 * has. Nothing needs a cache-busting parameter, and nothing needs revalidating.
 */
export function taxonVisualObjectName(ottId: number, buffer: Buffer): string {
  const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  /*
   * Extension from the same reading of the bytes that sets the content type.
   * It was hardcoded `.png` while the type was sniffed, so a JPEG — which is
   * what these providers mostly return — was stored under a name claiming to
   * be a PNG. Browsers were unaffected, since the proxy serves the stored
   * `Content-Type`, but anyone saving the file got a mislabelled one.
   */
  return `${taxonVisualObjectPrefix(ottId)}${digest}.${imageExtension(buffer)}`;
}

export async function taxonVisualObjectExists(ottId: number): Promise<boolean> {
  const names = await Storage.listObjects(taxonVisualObjectPrefix(ottId));
  return names.length > 0;
}

/** The format the bytes actually are, whatever the provider called it. */
function imageFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
  ) {
    return 'webp';
  }
  return 'png';
}

function imageContentType(buffer: Buffer): string {
  return `image/${imageFormat(buffer)}`;
}

function imageExtension(buffer: Buffer): string {
  const format = imageFormat(buffer);
  return format === 'jpeg' ? 'jpg' : format;
}

export type CreatedTaxonAsset = {
  assetId: string;
  url: string;
  generator: string;
};

export async function generateTaxonImageBuffer(
  prompt: string,
  options: BuildImageProviderOptions = {},
): Promise<GeneratedImage> {
  return runProviderFailover(
    buildImageProviders(prompt, options),
    'image',
  );
}

export async function persistTaxonImage(
  ottId: number,
  image: GeneratedImage,
): Promise<CreatedTaxonAsset> {
  const objectName = taxonVisualObjectName(ottId, image.buffer);

  const { path } = await Storage.uploadBuffer({
    buffer: image.buffer,
    objectName,
    contentType: imageContentType(image.buffer),
  });

  const asset = await Assets.create({
    url: path,
    generator: image.generator,
  });

  /*
   * Superseded renders of this taxon go now. Content-addressed names mean the
   * old object keeps its own URL rather than being overwritten, so without this
   * every regeneration would leave its predecessor behind, referenced by
   * nothing and paid for indefinitely.
   */
  const stale = (await Storage.listObjects(taxonVisualObjectPrefix(ottId)))
    .filter((name) => name !== objectName);

  await Promise.all(stale.map((name) => Storage.deleteObject(name)));

  return {
    assetId: String(asset._id),
    url: path,
    generator: image.generator,
  };
}

export async function generateTaxonImage(
  ottId: number,
  prompt: string,
  options: BuildImageProviderOptions = {},
): Promise<CreatedTaxonAsset> {
  const image = await generateTaxonImageBuffer(prompt, options);
  return persistTaxonImage(ottId, image);
}
