import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';

/**
 * Paid last-resort image models. Each has its own quota in AI Studio.
 */
export const DEFAULT_GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
] as const;

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
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

/** Env override: GEMINI_IMAGE_MODELS, else GEMINI_IMAGE_MODEL + defaults. */
export function resolveGeminiImageModels(): string[] {
  const fromList = parseModelList(process.env.GEMINI_IMAGE_MODELS);
  if (fromList.length > 0) {
    return fromList;
  }

  const preferred = process.env.GEMINI_IMAGE_MODEL?.trim();
  if (!preferred) {
    return [...DEFAULT_GEMINI_IMAGE_MODELS];
  }

  return [
    preferred,
    ...DEFAULT_GEMINI_IMAGE_MODELS.filter((model) => model !== preferred),
  ];
}

/**
 * Paid last resort — Gemini Developer API image models have no free tier.
 * Only runs when GEMINI_API_KEY is set.
 */
export function isGeminiImageConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateImageGemini(
  prompt: string,
  model: string,
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const provider = `gemini:${model}`;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    + `?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
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

  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  const data = imagePart?.inlineData?.data;
  if (!data) {
    throw new Error('Gemini returned no image data');
  }

  return Buffer.from(data, 'base64');
}
