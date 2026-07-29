import { ProviderLimitError } from 'server/Modules/TaxonVisual/providerLimitError.js';

export type ProviderAttempt<T> = {
  name: string;
  isConfigured: () => boolean;
  run: () => Promise<T>;
};

/** Transient / network-style failures before moving to the next agent. */
const DEFAULT_MAX_RETRIES = 3;
/** Rate-limit (retryable) — one short retry, then next agent’s quota. */
const RATE_LIMIT_MAX_RETRIES = 2;

/** Skip agents that already hit non-retryable budget this process. */
const exhaustedUntilMs = new Map<string, number>();
const BUDGET_COOLDOWN_MS = 30 * 60 * 1000;

function markProviderExhausted(provider: string, untilMs?: number): void {
  exhaustedUntilMs.set(
    provider,
    untilMs ?? (Date.now() + BUDGET_COOLDOWN_MS),
  );
}

export function isProviderCoolingDown(provider: string): boolean {
  const until = exhaustedUntilMs.get(provider);
  if (until == null) {
    return false;
  }
  if (Date.now() >= until) {
    exhaustedUntilMs.delete(provider);
    return false;
  }
  return true;
}

/** True if at least one configured provider is not in budget cooldown. */
export function anyProviderAvailable(
  providers: Pick<ProviderAttempt<unknown>, 'name' | 'isConfigured'>[],
): boolean {
  return providers.some(
    (provider) => provider.isConfigured() && !isProviderCoolingDown(provider.name),
  );
}

/** Parse "Please retry in 48.4s" style hints when present. */
function retryAfterMsFromMessage(message: string): number | null {
  const match = message.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i);
  if (!match) {
    return null;
  }
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return Math.ceil(seconds * 1000) + 1000;
}

async function withRetries<T>(
  provider: string,
  run: () => Promise<T>,
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < DEFAULT_MAX_RETRIES) {
    attempt += 1;
    try {
      return await run();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.message.toLowerCase().includes('content_policy')) {
        throw lastError;
      }

      if (lastError instanceof ProviderLimitError) {
        if (!lastError.retryable) {
          const retryAfter = retryAfterMsFromMessage(lastError.message);
          markProviderExhausted(
            provider,
            retryAfter != null
              ? Date.now() + Math.max(retryAfter, BUDGET_COOLDOWN_MS)
              : undefined,
          );
          throw lastError;
        }

        // Retryable rate limit: brief wait, then leave this agent’s quota.
        if (attempt >= RATE_LIMIT_MAX_RETRIES) {
          const retryAfter = retryAfterMsFromMessage(lastError.message);
          if (retryAfter != null && retryAfter <= 15_000) {
            markProviderExhausted(provider, Date.now() + retryAfter);
          }
          throw lastError;
        }

        const retryAfter = retryAfterMsFromMessage(lastError.message);
        const delayMs = retryAfter != null && retryAfter <= 10_000
          ? retryAfter
          : 2 ** (attempt - 1) * 1000;
        console.warn(
          `[TaxonVisual] "${provider}" rate-limited; retry ${attempt}/${RATE_LIMIT_MAX_RETRIES} in ${delayMs}ms`,
        );
        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
        continue;
      }

      if (attempt < DEFAULT_MAX_RETRIES) {
        const delayMs = 2 ** (attempt - 1) * 1000;
        console.warn(
          `[TaxonVisual] "${provider}" failed (${lastError.message}); `
          + `retry ${attempt}/${DEFAULT_MAX_RETRIES} in ${delayMs}ms`,
        );
        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
        continue;
      }
    }
  }

  throw lastError ?? new Error(`${provider} failed`);
}

/**
 * Walk the agent pipeline in order. Each agent gets its own retries;
 * limit/budget errors move on so later agents can use their quotas.
 * EXHAUSTED only if every attempt is a non-retryable limit error.
 */
export async function runProviderFailover<T>(
  providers: ProviderAttempt<T>[],
  kind: 'image' | 'description',
): Promise<T> {
  const configured = providers.filter((provider) => provider.isConfigured());
  if (configured.length === 0) {
    throw new Error(`No ${kind} providers configured`);
  }

  const available = configured.filter((provider) => {
    if (!isProviderCoolingDown(provider.name)) {
      return true;
    }
    console.warn(
      `[TaxonVisual] ${kind} skipping "${provider.name}" (budget cooldown)`,
    );
    return false;
  });

  if (available.length === 0) {
    throw new ProviderLimitError(
      `All ${kind} providers exhausted quota`,
      false,
      configured.map((provider) => provider.name).join('|'),
    );
  }

  console.log(
    `[TaxonVisual] ${kind} pipeline: ${available.map((p) => p.name).join(' → ')}`,
  );

  const errors: Error[] = [];

  for (const provider of available) {
    console.log(`[TaxonVisual] ${kind} trying "${provider.name}"…`);
    try {
      const result = await withRetries(provider.name, provider.run);
      console.log(`[TaxonVisual] ${kind} using "${provider.name}"`);
      return result;
    } catch (error) {
      const next = error instanceof Error ? error : new Error(String(error));
      errors.push(next);
      console.warn(
        `[TaxonVisual] ${kind} agent "${provider.name}" failed → next: ${next.message}`,
      );
    }
  }

  const allBudget = errors.every(
    (error) => error instanceof ProviderLimitError && !error.retryable,
  );
  if (allBudget) {
    throw new ProviderLimitError(
      `All ${kind} providers exhausted quota`,
      false,
      available.map((provider) => provider.name).join('|'),
    );
  }

  throw errors[errors.length - 1]
    ?? new Error(`${kind} generation failed`);
}
