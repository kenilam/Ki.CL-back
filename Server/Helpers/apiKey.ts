import type { Response } from 'express';
import { sign as cryptoSign } from 'node:crypto';
import { getPrivateKey } from './certs.js';

/**
 * Get milliseconds until next midnight.
 * If it's after 11:45 PM, returns ms until day-after-tomorrow midnight.
 */
export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  midnight.setDate(midnight.getDate() + 1);

  if (now.getHours() === 23 && now.getMinutes() >= 45) {
    midnight.setDate(midnight.getDate() + 1);
  }

  return midnight.getTime() - now.getTime();
}

/**
 * Generate a single x-api-key token: `base64url(timestamp).base64url(signature)`
 */
export function generateApiKey(): string | null {
  const key = getPrivateKey();
  if (!key) return null;

  try {
    const payload = `${Date.now()}`;
    const payloadB64 = Buffer.from(payload).toString('base64url');
    const signature = cryptoSign(null, Buffer.from(payload), key);
    return `${payloadB64}.${signature.toString('base64url')}`;
  } catch {
    return null;
  }
}

/**
 * Set the x-api-key cookie with expiry at next midnight.
 * Used by playground/introspection on `/graphql` only - never on `/api`.
 */
export function setApiKeyCookie(res: Response, apiKey: string): void {
  res.cookie('x-api-key', apiKey, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: msUntilMidnight(),
  });
}
