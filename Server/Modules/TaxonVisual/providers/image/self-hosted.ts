import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';
import {
  normaliseServerUrl,
  SELF_HOSTED,
  selfHostedBearer,
  timeoutMsFrom,
} from 'server/Modules/TaxonVisual/providers/self-hosted.js';

function baseUrl(): string | null {
  return normaliseServerUrl(process.env.IMAGE_SERVER_URL);
}

export function isSelfHostedImageConfigured(): boolean {
  return baseUrl() != null;
}

export function selfHostedImageTimeoutMs(): number {
  return timeoutMsFrom(process.env.IMAGE_SERVER_TIMEOUT_MS);
}

export type SelfHostedImage = {
  buffer: Buffer;
  /** MODEL_ID the service reports, e.g. Tongyi-MAI/Z-Image-Turbo */
  model: string;
};

/** POST /generate on ImageServer/. */
export async function generateImageSelfHosted(prompt: string): Promise<SelfHostedImage> {
  const url = baseUrl();
  if (!url) {
    throw new Error('IMAGE_SERVER_URL is not configured');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bearer = await selfHostedBearer(url, process.env.IMAGE_SERVER_TOKEN);
  if (bearer) {
    headers.Authorization = bearer;
  }

  const response = await fetch(`${url}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let detail = `Image server HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Not JSON; the status is all there is.
    }
    // 429 and 503 are the service saying "not now": a busy GPU or a reload.
    // Treated as a rate limit so the chain waits briefly, then moves on.
    if (response.status === 429 || response.status === 503) {
      throwIfProviderLimitError(`rate limit: ${detail}`, SELF_HOSTED);
    }
    throwIfProviderLimitError(detail, SELF_HOSTED);
    throw new Error(detail);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    model: response.headers.get('x-generator') ?? 'unknown',
  };
}
