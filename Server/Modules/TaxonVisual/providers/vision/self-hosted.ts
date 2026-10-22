import {
  chatCompletionSelfHosted,
  isSelfHostedTextConfigured,
  selfHostedTextTimeoutMs,
} from 'server/Modules/TaxonVisual/providers/text/self-hosted.js';
import type { VisionChatOptions } from './types.js';

/** The same service and model answer both; a VLM is what it serves. */
export const isSelfHostedVisionConfigured = isSelfHostedTextConfigured;
export const selfHostedVisionTimeoutMs = selfHostedTextTimeoutMs;

export async function chatSelfHostedVision(options: VisionChatOptions): Promise<string> {
  const dataUrl = `data:${options.mime};base64,${options.image.toString('base64')}`;
  return chatCompletionSelfHosted(
    [
      { role: 'system', content: options.system },
      {
        role: 'user',
        content: [
          { type: 'text', text: options.user },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    { maxTokens: options.maxTokens ?? 400, temperature: options.temperature ?? 0.1 },
  );
}
