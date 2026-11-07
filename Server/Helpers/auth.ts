import jwt from 'jsonwebtoken';
import { validateApiToken } from 'server/Middleware/apiToken.js';
import { getAccessTokenExpiry } from 'server/Helpers/tokenExpiry.js';

export interface TokenPayload {
  userGUID: string;
  aud: 'anon' | 'user';
  /** Passed a Turnstile check when the identity was issued. */
  human?: boolean;
  iat: number;
  exp: number;
}

/**
 * Parse a Cookie header into a key/value map.
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

/**
 * Check if a timestamp (ms) is expired (past midnight boundary).
 */
function isApiKeyExpired(timestamp: number): boolean {
  return new Date() >= getAccessTokenExpiry(new Date(timestamp));
}

/**
 * Validate a single x-api-key value: `base64url(timestamp).base64url(signature)`
 */
export function validateApiKey(token: string): boolean {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const payloadB64 = token.slice(0, dotIndex);
  const signatureB64 = token.slice(dotIndex + 1);

  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString();
    const timestamp = Number(payload);

    if (isNaN(timestamp)) return false;
    if (isApiKeyExpired(timestamp)) return false;

    return validateApiToken(signatureB64, payload);
  } catch {
    return false;
  }
}

/**
 * Verify a JWT and return its payload, or null. Tokens issued before the
 * fields were renamed carry `UserGUID`, which is read as `userGUID` until
 * the last of them expires, 9 days after the rename's release.
 */
export function verifyToken(token: string | undefined, key: string): TokenPayload | null {
  if (!token) return null;

  try {
    const payload = jwt.verify(token, key) as TokenPayload & { UserGUID?: string };
    const userGUID = payload.userGUID ?? payload.UserGUID;

    return userGUID ? { ...payload, userGUID } : null;
  } catch {
    return null;
  }
}

/**
 * Verify an access_token JWT. Returns payload or null.
 */
export function verifyAccessToken(token: string | undefined): TokenPayload | null {
  return verifyToken(token, process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY!);
}
