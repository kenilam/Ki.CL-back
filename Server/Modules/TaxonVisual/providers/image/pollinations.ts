import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import {
  adaptImagePromptForFlux,
  type ResolvedSpecimen,
} from 'server/Modules/TaxonVisual/prompt.js';

/** Legacy OpenAI-compatible path (can mis-bill Flux when pollen is 0). */
const POLLINATIONS_OPENAI_URL = 'https://gen.pollinations.ai/v1/images/generations';
/** Documented free Flux path — always 0 Pollen. */
const POLLINATIONS_FREE_BASE = 'https://image.pollinations.ai/prompt';
const MODEL = 'flux';
const SIZE = 1024;
const PROVIDER = 'pollinations';

interface PollinationsImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: { message?: string; code?: string };
}

/**
 * Flux is free (0 Pollen). Key optional — registered keys raise limits
 * and reduce watermark risk.
 */
export function isPollinationsImageConfigured(): boolean {
  // Always available as a free community failover (key optional).
  return process.env.POLLINATIONS_IMAGE_ENABLED !== 'false';
}

function authHeaders(): Record<string, string> {
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (!apiKey) {
    return {};
  }
  return { Authorization: `Bearer ${apiKey}` };
}

function isPollenBalanceError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('insufficient balance')
    || lower.includes('pollen')
    || lower.includes('available balance is 0')
  );
}

async function bufferFromImage(
  image: NonNullable<PollinationsImageResponse['data']>[number],
): Promise<Buffer> {
  if (image.b64_json) {
    return Buffer.from(image.b64_json, 'base64');
  }

  if (image.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Pollinations image (${imageResponse.status})`);
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error('Pollinations image missing b64_json and url');
}

/** Free GET endpoint — Flux does not consume Pollen. */
async function generateViaFreeGet(
  prompt: string,
  specimen?: ResolvedSpecimen | null,
): Promise<Buffer> {
  const adapted = adaptImagePromptForFlux(prompt, specimen);
  const url = new URL(
    `${POLLINATIONS_FREE_BASE}/${encodeURIComponent(adapted)}`,
  );
  url.searchParams.set('model', MODEL);
  url.searchParams.set('width', String(SIZE));
  url.searchParams.set('height', String(SIZE));
  url.searchParams.set('nologo', 'true');

  const response = await fetch(url.toString(), {
    headers: authHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text.trim() || `Pollinations HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as PollinationsImageResponse & {
      error?: string | { message?: string };
    };
    const message = typeof payload.error === 'string'
      ? payload.error
      : payload.error?.message
        ?? 'Pollinations free GET returned JSON error';
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  return Buffer.from(await response.arrayBuffer());
}

/** OpenAI-compatible POST — used when a key is present; may require Pollen. */
async function generateViaOpenAiCompat(
  prompt: string,
  specimen?: ResolvedSpecimen | null,
): Promise<Buffer> {
  const response = await fetch(POLLINATIONS_OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: adaptImagePromptForFlux(prompt, specimen),
      size: `${SIZE}x${SIZE}`,
      n: 1,
      response_format: 'b64_json',
    }),
  });

  let payload: PollinationsImageResponse = {};
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    payload = (await response.json()) as PollinationsImageResponse;
  } else if (response.ok) {
    return Buffer.from(await response.arrayBuffer());
  }

  if (!response.ok) {
    const message = payload.error?.message
      ?? payload.error?.code
      ?? `Pollinations HTTP ${response.status}`;
    throwIfProviderLimitError(message, PROVIDER);
    throw new Error(message);
  }

  const image = payload.data?.[0];
  if (!image) {
    throw new Error('Pollinations returned no image data');
  }

  return bufferFromImage(image);
}

export async function generateImagePollinations(
  prompt: string,
  specimen?: ResolvedSpecimen | null,
): Promise<Buffer> {
  // Flux is always free on the GET path. The OpenAI-compatible endpoint
  // can reject with "Insufficient balance" even for Flux when pollen is 0.
  try {
    return await generateViaFreeGet(prompt, specimen);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Rate/budget limits: do not burn a second path that needs pollen.
    if (isPollenBalanceError(message) || /rate|quota|limit|429/i.test(message)) {
      throw error;
    }
    console.warn(
      `[TaxonVisual] pollinations free GET failed (${message}); trying OpenAI-compat`,
    );
  }

  return generateViaOpenAiCompat(prompt, specimen);
}
