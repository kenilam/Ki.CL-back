import jwt from 'jsonwebtoken';
import { validateApiToken } from 'server/Middleware/apiToken.js';

export interface TokenPayload {
  UserGUID: string;
  aud: 'anon' | 'user';
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
  const created = new Date(timestamp);
  const now = new Date();

  const expiry = new Date(created);
  expiry.setHours(0, 0, 0, 0);
  expiry.setDate(expiry.getDate() + 1);

  if (created.getHours() === 23 && created.getMinutes() >= 45) {
    expiry.setDate(expiry.getDate() + 1);
  }

  return now >= expiry;
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
 * Verify an access_token JWT. Returns payload or null.
 */
export function verifyAccessToken(token: string | undefined): TokenPayload | null {
  if (!token) return null;

  try {
    return jwt.verify(
      token,
      process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY!,
    ) as TokenPayload;
  } catch {
    return null;
  }
}
