import { throwIfProviderLimitError } from 'server/DataSources/AI/providerLimitError.js';
import { parseModelList } from 'server/DataSources/AI/modelList.js';
import type { GeminiResponse } from 'server/DataSources/AI/types.js';
import type { VisionChatOptions } from './types.js';

/**
 * Google's multimodal models, quality → capacity, each with its own quota.
 * Same shape as the text chain, so a rate-limited model hands on to the next.
 */
export const DEFAULT_GEMINI_VISION_MODELS = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const;

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

function textOf(payload: GeminiResponse): string {
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}

async function readStream(response: Response, onText: (text: string) => void): Promise<string> {
  const reader = response.body?.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let text = '';

  if (!reader) {
    return text;
  }

  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    const events = (buffer + chunk.value).split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const event of events) {
      const data = event.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5)).join('');
      const payload = data.trim() ? (JSON.parse(data) as GeminiResponse) : null;

      if (payload?.error) {
        throw new Error(payload.error.message ?? payload.error.status ?? 'Gemini vision stream failed');
      }

      text += payload ? textOf(payload) : '';
      onText(text);
    }
  }

  return text;
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
  const method = options.onText ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`
    + `key=${encodeURIComponent(apiKey)}`;

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

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    const payload = (Array.isArray(body) ? body[0] : body) as GeminiResponse;
    const message = payload.error?.message
      ?? payload.error?.status
      ?? `Gemini vision HTTP ${response.status}`;
    throwIfProviderLimitError(message, provider);
    throw new Error(message);
  }

  const text = options.onText
    ? (await readStream(response, options.onText)).trim()
    : textOf((await response.json()) as GeminiResponse).trim();

  if (!text) {
    throw new Error('Gemini vision returned no text');
  }

  return text;
}
