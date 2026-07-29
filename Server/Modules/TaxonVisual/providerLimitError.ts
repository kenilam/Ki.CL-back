/** Quota / rate-limit — maps to GraphQL status EXHAUSTED. */
export class ProviderLimitError extends Error {
  readonly retryable: boolean;
  readonly provider: string;

  constructor(rawMessage: string, retryable: boolean, provider = 'unknown') {
    super(rawMessage);
    this.name = 'ProviderLimitError';
    this.retryable = retryable;
    this.provider = provider;
  }
}

/** @deprecated Use ProviderLimitError */
export const OpenAiLimitError = ProviderLimitError;

export function isBudgetOrRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    isBudgetError(message)
    || lower.includes('rate limit')
    || lower.includes('rate_limit')
    || lower.includes('too many requests')
  );
}

export function isBudgetError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('billing hard limit')
    || lower.includes('billing_hard_limit')
    || lower.includes('insufficient_quota')
    || lower.includes('insufficient balance')
    || lower.includes('exceeded your current quota')
    || lower.includes('quota exceeded')
    || lower.includes('resource_exhausted')
    || lower.includes('free_tier')
    // Gemini/AI Studio: model not on free tier (limit: 0), not a soft RPM.
    || /limit:\s*0\b/.test(lower)
    || lower.includes('daily free allocation')
    || lower.includes('used up your daily')
    || (lower.includes('neurons') && (
      lower.includes('limit')
      || lower.includes('used up')
      || lower.includes('allocation')
    ))
    || (lower.includes('pollen') && (
      lower.includes('balance')
      || lower.includes('insufficient')
      || lower.includes('0.0000')
    ))
  );
}

export function throwIfProviderLimitError(
  rawMessage: string,
  provider: string,
): void {
  if (!isBudgetOrRateLimitError(rawMessage)) {
    return;
  }

  throw new ProviderLimitError(
    rawMessage,
    !isBudgetError(rawMessage),
    provider,
  );
}
