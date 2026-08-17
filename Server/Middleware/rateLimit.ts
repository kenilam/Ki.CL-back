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

/**
 * Set rate limit headers on the response.
 */
export function setRateLimitHeaders(res: Response, remaining: number, limit: number): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
}
