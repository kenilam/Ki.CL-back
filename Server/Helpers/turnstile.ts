import type { IncomingHttpHeaders } from 'node:http';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Cloudflare rejects anything longer, so there is no point sending it. */
const MAX_TOKEN_LENGTH = 2048;

const TIMEOUT_MS = 5000;

/**
 * The browser sends the widget's token here rather than in the GraphQL
 * variables, so `authenticate` can check it before any operation runs. The
 * Ki.CL web server has to pass it through to us.
 */
export const TURNSTILE_HEADER = 'x-turnstile-token';

/** Codes that mean our setup is wrong, not the visitor. */
const OUR_FAULT = new Set(['missing-input-secret', 'invalid-input-secret', 'internal-error']);

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
  action?: string;
  metadata?: { result_with_testing_key?: boolean };
}

export type TurnstileVerdict =
  | { ok: true; skipped: boolean }
  /*
   * `rejected` is the visitor's problem: no token, a forged or spent one, or
   * one made for another page. `unavailable` is ours: no secret, or
   * Cloudflare could not answer. Callers decide whether `unavailable` blocks.
   */
  | { ok: false; reason: 'rejected' | 'unavailable'; codes: string[] };

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function turnstileToken(headers: IncomingHttpHeaders): string | null {
  const value = headers[TURNSTILE_HEADER];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Hostnames the widget may run on. Unset accepts any the secret's widget allows. */
function allowedHostnames(): string[] {
  return (process.env.TURNSTILE_HOSTNAMES ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks a Turnstile token with Cloudflare.
 *
 * Tokens are single-use and last 300 seconds, so this never caches a result.
 * Remember the pass instead, on the session or the caller.
 *
 * `action` must match the one the widget was rendered with, so a token solved
 * on one form cannot be spent on another. The visitor's address is not sent:
 * this service does not read it.
 *
 * With no secret set outside production it lets everyone through, so local
 * development works without a widget.
 */
export async function verifyTurnstile({
  token,
  action,
}: {
  token: string | null;
  action: string;
}): Promise<TurnstileVerdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return process.env.NODE_ENV === 'production'
      ? { ok: false, reason: 'unavailable', codes: ['missing-input-secret'] }
      : { ok: true, skipped: true };
  }

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'rejected', codes: ['invalid-input-response'] };
  }

  const body = new URLSearchParams({ secret, response: token });

  let payload: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return { ok: false, reason: 'unavailable', codes: [`http-${response.status}`] };
    }
    payload = (await response.json()) as SiteverifyResponse;
  } catch (error) {
    const message = error instanceof Error ? error.name : 'fetch-failed';
    return { ok: false, reason: 'unavailable', codes: [message] };
  }

  const codes = payload['error-codes'] ?? [];
  if (!payload.success) {
    const reason = codes.some((code) => OUR_FAULT.has(code)) ? 'unavailable' : 'rejected';
    return { ok: false, reason, codes };
  }

  /*
   * Cloudflare's test secrets answer without an action and with
   * `example.com` as the hostname, so the checks below would reject every
   * test token. Only a test secret sets this flag.
   */
  if (payload.metadata?.result_with_testing_key) {
    return { ok: true, skipped: false };
  }

  if (payload.action !== action) {
    return { ok: false, reason: 'rejected', codes: ['action-mismatch'] };
  }

  const hostnames = allowedHostnames();
  if (hostnames.length && !hostnames.includes(payload.hostname?.toLowerCase() ?? '')) {
    return { ok: false, reason: 'rejected', codes: ['hostname-mismatch'] };
  }

  return { ok: true, skipped: false };
}
