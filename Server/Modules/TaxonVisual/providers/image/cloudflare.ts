import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import {
  adaptImagePromptForFlux,
  type ResolvedSpecimen,
} from 'server/Modules/TaxonVisual/prompt.js';

const MODEL = '@cf/black-forest-labs/flux-1-schnell';
/** Schnell max is 8 - use the ceiling; 4 was too soft for taxon fidelity. */
const STEPS = 8;
const MAX_PROMPT = 2048;
const PROVIDER = 'cloudflare';

interface CloudflareAiResponse {
  success?: boolean;
  result?: { image?: string };
  errors?: Array<{ message?: string; code?: number }>;
}

export function isCloudflareImageConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
    && process.env.CLOUDFLARE_API_TOKEN?.trim(),
  );
}

export async function generateImageCloudflare(
  prompt: string,
  specimen?: ResolvedSpecimen | null,
): Promise<Buffer> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not configured');
  }

  const adapted = adaptImagePromptForFlux(prompt, specimen);
  const clipped = adapted.length > MAX_PROMPT
    ? adapted.slice(0, MAX_PROMPT)
    : adapted;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: clipped,
        steps: STEPS,
      }),
    },
  );

  const payload = (await response.json()) as CloudflareAiResponse;
  const message = payload.errors?.[0]?.message
    ?? (!response.ok ? `Cloudflare HTTP ${response.status}` : null);

  if (!response.ok || payload.success === false) {
    const detail = message ?? 'Cloudflare Workers AI request failed';
    throwIfProviderLimitError(detail, PROVIDER);
    throw new Error(detail);
  }

  const b64 = payload.result?.image;
  if (!b64) {
    throw new Error('Cloudflare returned no image data');
  }

  return Buffer.from(b64, 'base64');
}
