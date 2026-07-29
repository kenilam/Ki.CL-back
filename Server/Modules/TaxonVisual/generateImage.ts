import { Storage } from 'server/DataSources/Google/index.js';
import { Assets } from 'server/DataSources/MongoDB/Assets/Model.js';
import { runProviderFailover } from './providers/failover.js';
import {
  buildImageProviders,
  type BuildImageProviderOptions,
} from './providers/image/index.js';
import type { GeneratedImage } from './providers/image/types.js';

export function taxonVisualObjectName(ottId: number): string {
  return `${ottId}.png`;
}

/** Proxied public path, e.g. `/assets/taxon-visual/123.png`. */
export function taxonVisualPublicPath(ottId: number): string {
  return Storage.publicObjectPath(taxonVisualObjectName(ottId));
}

export async function taxonVisualObjectExists(ottId: number): Promise<boolean> {
  return Storage.objectExists(taxonVisualObjectName(ottId));
}

function imageContentType(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
  ) {
    return 'image/webp';
  }
  return 'image/png';
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
  const { path } = await Storage.uploadBuffer({
    buffer: image.buffer,
    objectName: taxonVisualObjectName(ottId),
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

export async function generateTaxonImage(
  ottId: number,
  prompt: string,
  options: BuildImageProviderOptions = {},
): Promise<CreatedTaxonAsset> {
  const image = await generateTaxonImageBuffer(prompt, options);
  return persistTaxonImage(ottId, image);
}
