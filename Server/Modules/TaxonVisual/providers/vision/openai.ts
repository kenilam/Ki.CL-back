import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import type { VisionChatOptions } from './types.js';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_OPENAI_VISION_MODEL = 'gpt-4o';

export function resolveOpenAiVisionModel(): string {
  return process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_OPENAI_VISION_MODEL;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  error?: { message?: string; code?: string; type?: string };
}

export function isOpenAiVisionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function chatOpenAiVision(
  options: VisionChatOptions,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = resolveOpenAiVisionModel();
  const provider = `openai:${model}`;
  const dataUrl = `data:${options.mime};base64,${options.image.toString('base64')}`;

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 400,
      messages: [
        { role: 'system', content: options.system },
        {
          role: 'user',
          content: [
            { type: 'text', text: options.user },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const payload = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `OpenAI vision HTTP ${response.status}`;
    throwIfProviderLimitError(message, provider);
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI vision returned no text');
  }

  return text;
}
