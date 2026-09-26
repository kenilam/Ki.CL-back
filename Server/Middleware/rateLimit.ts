import type { Response } from 'express';
import { RateLimits } from 'server/DataSources/MongoDB/RateLimits/Model.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mongo's code for a unique index conflict: two first requests raced. */
const DUPLICATE_KEY = 11000;

export type RateLimitVerdict = { allowed: boolean; remaining: number; limit: number };

function envLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Counts one request against `key`, in a window that starts with the key's
 * first request and lasts a day. One atomic write: an ended window starts
 * again at 1, otherwise the count goes up. Requests past the limit still
 * count, which changes nothing.
 */
async function consume(key: string, limit: number, retried = false): Promise<RateLimitVerdict> {
  const now = new Date();
  const open = { $gt: ['$resetAt', now] };

  try {
    const row = await RateLimits.findOneAndUpdate(
      { key },
      [{
        $set: {
          key,
          count: { $cond: [open, { $add: ['$count', 1] }, 1] },
          resetAt: { $cond: [open, '$resetAt', new Date(now.getTime() + DAY_MS)] },
        },
      }],
      { upsert: true, new: true, lean: true, updatePipeline: true },
    );
    const count = row?.count ?? 1;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
  } catch (error) {
    if (!retried && (error as { code?: number }).code === DUPLICATE_KEY) {
      return consume(key, limit, true);
    }
    /*
     * The limit is there to slow abuse, not to guard the data, and when
     * Mongo can't answer most of the API can't either. Refusing would add
     * a lockout on top of an outage.
     */
    console.warn(`[rateLimit] not counted: ${error instanceof Error ? error.message : String(error)}`);
    return { allowed: true, remaining: limit, limit };
  }
}

/** Requests with a session, per token owner. */
export function checkRateLimit(userGUID: string): Promise<RateLimitVerdict> {
  return consume(`token:${userGUID}`, envLimit('RATE_LIMIT_PER_DAY', 100));
}

/**
 * Set rate limit headers on the response.
 */
export function setRateLimitHeaders(res: Response, remaining: number, limit: number): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
}

/**
 * Refuse with a GraphQL error, so the client reads it like any resolver's
 * TOO_MANY_REQUESTS. With a plain JSON body Apollo only sees a failed
 * request. The `graphql-response+json` type is what lets Apollo read the
 * errors from a response that isn't 2xx.
 */
export function refuseTooManyRequests(res: Response): void {
  res
    .status(429)
    .type('application/graphql-response+json')
    .json({
      errors: [{
        message: 'Too many requests. Try again later.',
        extensions: { code: 'TOO_MANY_REQUESTS' },
      }],
    });
}
