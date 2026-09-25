import { throwIfProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';

const PROVIDER = 'self-hosted';
/**
 * A cold Cloud Run GPU instance loads its weights before it answers, and the
 * platform holds the request while that happens. Four minutes covers a load
 * plus one render for every model the service documents.
 */
const DEFAULT_TIMEOUT_MS = 240_000;
const METADATA_IDENTITY_URL = 'http://metadata.google.internal/computeMetadata/v1'
  + '/instance/service-accounts/default/identity';

function baseUrl(): string | null {
  const raw = process.env.IMAGE_SERVER_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

export function isSelfHostedImageConfigured(): boolean {
  return baseUrl() != null;
}

export function selfHostedImageTimeoutMs(): number {
  const raw = Number(process.env.IMAGE_SERVER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

/** True when the service should be tried before OpenAI. */
export function isSelfHostedImageFirst(): boolean {
  return process.env.IMAGE_SERVER_FIRST === 'true';
}

/**
 * Bearer for the request. A shared token wins when set; otherwise, on Google
 * Cloud, an ID token for the service from the metadata server, which is what
 * Cloud Run's IAM check expects. Anywhere else the request goes out bare.
 */
async function authorization(url: string): Promise<string | null> {
  const token = process.env.IMAGE_SERVER_TOKEN?.trim();
  if (token) {
    return `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `${METADATA_IDENTITY_URL}?audience=${encodeURIComponent(url)}`,
      { headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(2_000) },
    );
    if (!response.ok) {
      return null;
    }
    return `Bearer ${await response.text()}`;
  } catch {
    return null;
  }
}

export type SelfHostedImage = {
  buffer: Buffer;
  /** MODEL_ID the service reports, e.g. Tongyi-MAI/Z-Image-Turbo */
  model: string;
};

export async function generateImageSelfHosted(prompt: string): Promise<SelfHostedImage> {
  const url = baseUrl();
  if (!url) {
    throw new Error('IMAGE_SERVER_URL is not configured');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bearer = await authorization(url);
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
      throwIfProviderLimitError(`rate limit: ${detail}`, PROVIDER);
    }
    throwIfProviderLimitError(detail, PROVIDER);
    throw new Error(detail);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    model: response.headers.get('x-generator') ?? 'unknown',
  };
}
