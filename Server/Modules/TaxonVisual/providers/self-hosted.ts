import type { ProviderAttempt } from './failover.js';

const METADATA_IDENTITY_URL = 'http://metadata.google.internal/computeMetadata/v1'
  + '/instance/service-accounts/default/identity';

/**
 * A cold Cloud Run GPU instance loads its weights before it answers, and the
 * platform holds the request while that happens. Four minutes covers a load
 * plus one call for every model the services document.
 */
const DEFAULT_TIMEOUT_MS = 240_000;

/** The `self-hosted` name every provider backed by our own services shares. */
export const SELF_HOSTED = 'self-hosted';

export function normaliseServerUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : null;
}

export function timeoutMsFrom(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

/**
 * Bearer for a request to one of our services. A shared token wins when set;
 * otherwise, on Google Cloud, an ID token for the service from the metadata
 * server, which is what Cloud Run's IAM check expects. Anywhere else the
 * request goes out bare.
 */
export async function selfHostedBearer(
  url: string,
  sharedToken: string | undefined,
): Promise<string | null> {
  const token = sharedToken?.trim();
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

/**
 * SELF_HOSTED_ONLY=true keeps every request inside our own services, so no
 * external quota or bill is ever touched, whatever keys happen to be set.
 */
export function isSelfHostedOnly(): boolean {
  return process.env.SELF_HOSTED_ONLY === 'true';
}

export function applySelfHostedOnly<T>(
  providers: ProviderAttempt<T>[],
): ProviderAttempt<T>[] {
  return isSelfHostedOnly()
    ? providers.filter((provider) => provider.name === SELF_HOSTED)
    : providers;
}
