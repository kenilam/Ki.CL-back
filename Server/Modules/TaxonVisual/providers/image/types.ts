/** Bytes from an image provider plus provenance for the assets table. */
export type GeneratedImage = {
  buffer: Buffer;
  /** e.g. openai:gpt-image-1 - stored on Asset.generator */
  generator: string;
};
