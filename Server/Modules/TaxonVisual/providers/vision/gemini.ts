import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import type { VisionChatOptions } from './types.js';

/**
 * Google's multimodal models, quality → capacity, each with its own quota.
 * Same shape as the text chain, so a rate-limited model hands on to the next.
 */
export const DEFAULT_GEMINI_VISION_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; status?: string; code?: number };
}

function parseModelList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return [...new Set(
    raw.split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}

/** Env override: GEMINI_VISION_MODELS, else the defaults above. */
export function resolveGeminiVisionModels(): string[] {
  const fromList = parseModelList(process.env.GEMINI_VISION_MODELS);
  if (fromList.length > 0) {
    return fromList;
  }
  return [...DEFAULT_GEMINI_VISION_MODELS];
}

export function isGeminiVisionConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function chatGeminiVision(
  options: VisionChatOptions & { model: string },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const { model } = options;
  const provider = `gemini:${model}`;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    + `?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [
        {
          parts: [
            { text: options.user },
            {
              inline_data: {
                mime_type: options.mime,
                data: options.image.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.1,
        /*
         * Far larger than the reply needs.
         *
         * These models spend reasoning tokens from the same budget as the
         * answer, and thinking runs first - so a budget sized for the JSON is
         * eaten before the JSON starts, and it arrives cut off mid-object. That
         * truncation is what used to be silently converted into a passing
         * score. `thinkingConfig` would be the direct way to switch reasoning
         * off, but these models reject it outright (HTTP 400), so the budget is
         * simply made big enough for both.
         */
        maxOutputTokens: options.maxTokens ?? 2048,
        // The scorer wants JSON and nothing else; asking for it here means the
        // reply cannot arrive wrapped in prose or a fence.
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.status
      ?? `Gemini vision HTTP ${response.status}`;
    throwIfProviderLimitError(message, provider);
    throw new Error(message);
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini vision returned no text');
  }

  return text;
}
