import { ImageAgentJobs } from 'server/DataSources/MongoDB/ImageAgentJobs/Model.js';
import { ImageAgentThreads } from 'server/DataSources/MongoDB/ImageAgentThreads/Model.js';
import { TooManyRequests } from 'server/Errors/index.js';
import { ImageAgentRole, ImageAgentThreadStatus } from 'server/Types/graphql.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Shown for every exhausted limit, the caller's or the service's. It doesn't
 * say which one or when it resets, because that would tell someone trying to
 * get around it where to look.
 */
const UNAVAILABLE = 'The agent can’t take more requests right now. Try again later.';

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Drawings one caller may have in a rolling day. */
export function perUserDailyLimit(): number {
  return envNumber('IMAGE_AGENT_DAILY_LIMIT_PER_USER', 5);
}

/** Drawings the whole service makes in a rolling day - the spend ceiling. */
export function globalDailyLimit(): number {
  return envNumber('IMAGE_AGENT_DAILY_LIMIT_GLOBAL', 200);
}

/**
 * Messages one caller may send in a rolling day. Every message costs a
 * classifier call, so this caps that spending.
 */
export function perUserDailyMessages(): number {
  return envNumber('IMAGE_AGENT_DAILY_MESSAGES_PER_USER', 40);
}

/** Messages the whole service answers in a rolling day - the classifier's spend ceiling. */
export function globalDailyMessages(): number {
  return envNumber('IMAGE_AGENT_DAILY_MESSAGES_GLOBAL', 1000);
}

/**
 * Different people who may use the agent in a rolling hour. Someone already
 * counted this hour carries on; a new person waits for a place.
 */
export function hourlyCallers(): number {
  return envNumber('IMAGE_AGENT_HOURLY_USERS', 10);
}

/** Seconds a caller waits between messages. */
export function minIntervalSeconds(): number {
  return envNumber('IMAGE_AGENT_MIN_INTERVAL_SECONDS', 5);
}

export type Allowance = {
  remaining: number;
  limit: number;
  nextAllowedAt: Date | null;
  /** A turn is running in one of the caller's conversations. */
  busy: boolean;
};

/**
 * A caller is the owner of the session token, and nothing else. Clearing
 * cookies or changing device starts a new session with its own allowance; the
 * Turnstile check on ExchangeToken is what keeps that from being scripted.
 */

/** When the caller last said anything, across every conversation. */
async function lastMessageAt(ownerGUID: string): Promise<Date | null> {
  const [row] = await ImageAgentThreads.aggregate<{ at: Date }>([
    { $match: { ownerGUID } },
    { $unwind: '$messages' },
    { $match: { 'messages.role': ImageAgentRole.User } },
    { $sort: { 'messages.at': -1 } },
    { $limit: 1 },
    { $project: { _id: 0, at: '$messages.at' } },
  ]);
  return row?.at ?? null;
}

/** Messages sent since `since`: the caller's when given, everyone's when not. */
async function messagesSince(since: Date, ownerGUID: string | null = null): Promise<number> {
  const owner = ownerGUID ? { ownerGUID } : {};

  const [row] = await ImageAgentThreads.aggregate<{ count: number }>([
    { $match: { ...owner, updatedAt: { $gte: since } } },
    { $unwind: '$messages' },
    {
      $match: {
        'messages.role': ImageAgentRole.User,
        'messages.at': { $gte: since },
      },
    },
    { $count: 'count' },
  ]);
  return row?.count ?? 0;
}

/** Who has sent a message since `since`, one entry per session owner. */
async function callersSince(since: Date): Promise<string[]> {
  const rows = await ImageAgentThreads.aggregate<{ _id: string }>([
    { $match: { updatedAt: { $gte: since } } },
    { $unwind: '$messages' },
    { $match: { 'messages.role': ImageAgentRole.User, 'messages.at': { $gte: since } } },
    { $group: { _id: '$ownerGUID' } },
  ]);
  return rows.map((row) => row._id);
}

/**
 * What a caller has left today, and when they may speak next.
 *
 * Counted from the collections rather than an in-memory map, so a restart
 * does not hand everyone a fresh allowance. Drawings that were turned away
 * never became drawings, so they do not count here; the messages that asked
 * for them count against the message allowance instead.
 */
export async function allowanceFor(ownerGUID: string): Promise<Allowance> {
  const limit = perUserDailyLimit();
  const since = new Date(Date.now() - DAY_MS);

  const [drawn, spokeAt, busy] = await Promise.all([
    ImageAgentJobs.countDocuments({ ownerGUID, createdAt: { $gte: since } }),
    lastMessageAt(ownerGUID),
    ImageAgentThreads.exists({ ownerGUID, status: { $ne: ImageAgentThreadStatus.Idle } }),
  ]);

  let nextAllowedAt: Date | null = null;
  if (spokeAt) {
    const cooldownEnds = new Date(spokeAt.getTime() + minIntervalSeconds() * 1000);
    if (cooldownEnds.getTime() > Date.now()) {
      nextAllowedAt = cooldownEnds;
    }
  }

  return { remaining: Math.max(0, limit - drawn), limit, nextAllowedAt, busy: Boolean(busy) };
}

/**
 * Throws a TOO_MANY_REQUESTS error when the caller may not speak right now.
 *
 * Refusals here are not recorded. A quota refusal that wrote a message would
 * count against the very allowance it enforces and restart the cooldown it
 * was enforcing, so a double-click would lock its owner out for good.
 */
export async function assertWithinQuota(ownerGUID: string): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const hourAgo = new Date(Date.now() - HOUR_MS);

  const [allowance, spoken, spokenEverywhere, globalDrawn, recent] = await Promise.all([
    allowanceFor(ownerGUID),
    messagesSince(since, ownerGUID),
    messagesSince(since),
    ImageAgentJobs.countDocuments({ createdAt: { $gte: since } }),
    callersSince(hourAgo),
  ]);

  const extensions = { remaining: allowance.remaining, limit: allowance.limit };

  if (allowance.busy) {
    throw TooManyRequests('Wait for the agent to answer before sending more.', extensions);
  }

  if (allowance.nextAllowedAt) {
    throw TooManyRequests('Too soon after the last message.', {
      ...extensions,
      nextAllowedAt: allowance.nextAllowedAt.toISOString(),
    });
  }

  if (spoken >= perUserDailyMessages()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }

  if (allowance.remaining <= 0) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }

  if (!recent.includes(ownerGUID) && recent.length >= hourlyCallers()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }

  if (spokenEverywhere >= globalDailyMessages()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }

  if (globalDrawn >= globalDailyLimit()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }
}
