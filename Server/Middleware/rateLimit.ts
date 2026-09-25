import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  remaining: number;
}

// In-memory store keyed by UserGUID from JWT
export const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_REQUESTS = Number(process.env.RATE_LIMIT_PER_DAY) || 100;

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Rate limit is applied at the GraphQL context level (after JWT is decoded)
  // This middleware just sets standard headers - actual enforcement is in context
  next();
}

/**
 * Check and decrement rate limit for a given UserGUID.
 * Returns { allowed, remaining, limit } or throws.
 */
export function checkRateLimit(userGUID: string): { allowed: boolean; remaining: number; limit: number } {
  const limit = MAX_REQUESTS;

  let entry = rateLimitStore.get(userGUID);

  if (!entry) {
    // First request for this token - initialize
    entry = { remaining: limit };
    rateLimitStore.set(userGUID, entry);
  }

  if (entry.remaining <= 0) {
    return { allowed: false, remaining: 0, limit };
  }

  entry.remaining -= 1;

  return { allowed: true, remaining: entry.remaining, limit };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Past this many entries, expired ones are cleared before adding more. */
const SWEEP_AT = 10_000;

interface AddressEntry {
  count: number;
  resetAt: number;
}

/**
 * Requests without a session, keyed by `addressKey`. A token's allowance
 * resets when a token is issued; an address has no such moment, so it
 * resets a day after its first request instead. In memory like the token
 * store, so each instance counts on its own and a restart clears it.
 */
const addressStore = new Map<string, AddressEntry>();

function perAddressDailyLimit(): number {
  const value = Number(process.env.RATE_LIMIT_PER_ADDRESS_PER_DAY);
  return Number.isFinite(value) && value > 0 ? value : 2000;
}

export function checkAddressRateLimit(address: string): { allowed: boolean; remaining: number; limit: number } {
  const limit = perAddressDailyLimit();
  const now = Date.now();

  if (addressStore.size > SWEEP_AT) {
    for (const [key, { resetAt }] of addressStore) {
      if (resetAt <= now) addressStore.delete(key);
    }
  }

  let entry = addressStore.get(address);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + DAY_MS };
    addressStore.set(address, entry);
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }

  entry.count += 1;

  return { allowed: true, remaining: limit - entry.count, limit };
}

/**
 * Set rate limit headers on the response.
 */
export function setRateLimitHeaders(res: Response, remaining: number, limit: number): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
}
