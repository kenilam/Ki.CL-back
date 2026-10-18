import type { TextChatOptions } from 'server/Modules/TaxonVisual/providers/text/types.js';

export type VisionChatOptions = TextChatOptions & {
  /** Raw image bytes - encoded per provider, never stored. */
  image: Buffer;
  /** Sniffed from the buffer, since generators differ on format. */
  mime: string;
};
