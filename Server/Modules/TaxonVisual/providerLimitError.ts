/** Quota / rate-limit — maps to GraphQL status EXHAUSTED. */
export class ProviderLimitError extends Error {
  readonly retryable: boolean;
  readonly provider: string;
  /**
   * Whether this can only be resolved by paying.
   *
   * A daily allowance and an empty balance both stop the work, but only one of
   * them ends on its own — and telling a reader to "try again shortly" when it
   * does not is how the failure message came to be untrue.
   */
  readonly needsBilling: boolean;

  constructor(
    rawMessage: string,
    retryable: boolean,
    provider = 'unknown',
    needsBilling = isCreditExhaustedError(rawMessage),
  ) {
    super(rawMessage);
    this.name = 'ProviderLimitError';
    this.retryable = retryable;
    this.provider = provider;
    this.needsBilling = needsBilling;
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

/**
 * A spent account, as opposed to a quota that refills.
 *
 * Both arrive as a 429 and both are non-retryable in the moment, but they end
 * very differently: a daily allocation returns tomorrow, while an empty balance
 * returns only when someone pays. Cooling an exhausted account for the same
 * half hour as a rate limit means retrying it forever, twice an hour, against a
 * wall — which is what a whole library of failover renders was quietly doing.
 */
export function isCreditExhaustedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('insufficient_quota')
    || lower.includes('insufficient balance')
    || lower.includes('no credits remaining')
    || lower.includes('credit_balance_exhausted')
    || lower.includes('billing hard limit')
    || lower.includes('billing_hard_limit')
    || (lower.includes('pollen') && lower.includes('insufficient'))
  );
}

export function isBudgetError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /*
     * A spent account is a budget error by definition. Kept in step
     * deliberately: these two lists disagreeing meant OpenAI's actual wording,
     * "You have no credits remaining", was recognised by one and not the other
     * — so no limit error was raised at all, and every call spent three full
     * retries against an empty account before failing over.
     */
    isCreditExhaustedError(message)
    || lower.includes('billing hard limit')
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
