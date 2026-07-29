import { verify as cryptoVerify } from 'node:crypto';
import { getPublicKey } from 'server/Helpers/certs.js';

/**
 * Verify an Ed25519 signature against a payload.
 * Uses the public key cached in memory (loaded from DB on startup).
 */
export function validateApiToken(signature: string, payload: string): boolean {
  const key = getPublicKey();
  if (!key) return false;

  try {
    return cryptoVerify(
      null,
      Buffer.from(payload),
      key,
      Buffer.from(signature, 'base64url'),
    );
  } catch {
    return false;
  }
}
