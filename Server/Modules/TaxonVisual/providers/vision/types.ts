export type VisionChatOptions = {
  system: string;
  user: string;
  /** Raw image bytes — encoded per provider, never stored. */
  image: Buffer;
  /** Sniffed from the buffer, since generators differ on format. */
  mime: string;
  maxTokens?: number;
  temperature?: number;
};
