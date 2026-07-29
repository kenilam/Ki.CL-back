import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import type { TextChatOptions } from './types.js';

/**
 * Quality → capacity within Google (last org in the text pipeline).
 * Each model has its own RPM/TPM/RPD in AI Studio.
 */
export const DEFAULT_GEMINI_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
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

/** Env override: GEMINI_TEXT_MODELS, else GEMINI_TEXT_MODEL + defaults. */
export function resolveGeminiTextModels(): string[] {
  const fromList = parseModelList(process.env.GEMINI_TEXT_MODELS);
  if (fromList.length > 0) {
    return fromList;
  }

  const preferred = process.env.GEMINI_TEXT_MODEL?.trim();
  if (!preferred) {
    return [...DEFAULT_GEMINI_TEXT_MODELS];
  }

  return [
    preferred,
    ...DEFAULT_GEMINI_TEXT_MODELS.filter((model) => model !== preferred),
  ];
}

export function isGeminiTextConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function chatGemini(
  options: TextChatOptions & { model: string },
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
      systemInstruction: {
        parts: [{ text: options.system }],
      },
      contents: [{ parts: [{ text: options.user }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxTokens ?? 120,
      },
    }),
  });

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.status
      ?? `Gemini HTTP ${response.status}`;
    throwIfProviderLimitError(message, provider);
    throw new Error(message);
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned no text');
  }

  return text.replace(/^["']|["']$/g, '');
}

export async function generateDescriptionGemini(
  prompt: string,
  model: string,
): Promise<string> {
  return chatGemini({
    model,
    system:
      'You write concise, accurate natural-history blurbs. Reply with the description only.',
    user: prompt,
    maxTokens: 120,
    temperature: 0.4,
  });
}
