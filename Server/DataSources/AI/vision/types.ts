import type { TextChatOptions } from 'server/DataSources/AI/types.js';

export type VisionChatOptions = TextChatOptions & {
  /** Raw image or PDF bytes - encoded per provider, never stored. */
  image: Buffer;
  /** Sniffed from the buffer, since generators differ on format. */
  mime: string;
  /** Called with the reply so far as it streams. Only Gemini streams; the others answer once. */
  onText?: (text: string) => void;
};
