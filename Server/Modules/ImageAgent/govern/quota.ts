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
 * Who is asking: the token's owner, the address they asked from, or both.
 * Either one may be missing - no cookie yet, or an address that cannot be
 * trusted.
 */
export type Caller = {
  ownerGUID: string | null;
  address: string | null;
};

/**
 * One allowance per person, whether they are known by their cookie or by
 * their address. Usage under either counts, so clearing cookies starts a new
 * session but not a new allowance. The cost is that people sharing an
 * address share it too.
 */
type Filter = Record<string, unknown>;

function either(
  caller: Caller,
  byOwner: (ownerGUID: string) => Filter,
  byAddress: (address: string) => Filter,
): { $or: Filter[] } | null {
  const clauses = [
    ...(caller.ownerGUID ? [byOwner(caller.ownerGUID)] : []),
    ...(caller.address ? [byAddress(caller.address)] : []),
  ];
  return clauses.length ? { $or: clauses } : null;
}

/**
 * Before `$unwind`, a thread the caller owns or wrote in from their address.
 * After it, the same filter picks the caller's messages out of those threads.
 */
const threadOf = (caller: Caller) => either(
  caller,
  (ownerGUID) => ({ ownerGUID }),
  (address) => ({ 'messages.addressKey': address }),
);

const jobOf = (caller: Caller) => either(
  caller,
  (ownerGUID) => ({ ownerGUID }),
  (address) => ({ addressKey: address }),
);

/** When the caller last said anything, across every conversation. */
async function lastMessageAt(caller: Caller): Promise<Date | null> {
  const threads = threadOf(caller);
  const messages = threadOf(caller);
  if (!threads || !messages) return null;

  const [row] = await ImageAgentThreads.aggregate<{ at: Date }>([
    { $match: threads },
    { $unwind: '$messages' },
    { $match: { ...messages, 'messages.role': ImageAgentRole.User } },
    { $sort: { 'messages.at': -1 } },
    { $limit: 1 },
    { $project: { _id: 0, at: '$messages.at' } },
  ]);
  return row?.at ?? null;
}

/** Messages people have sent since `since`: the caller's when given, everyone's when not. */
async function messagesSince(since: Date, caller: Caller | null = null): Promise<number> {
  const threads = caller ? threadOf(caller) : {};
  const messages = caller ? threadOf(caller) : {};
  if (!threads || !messages) return 0;

  const [row] = await ImageAgentThreads.aggregate<{ count: number }>([
    { $match: { ...threads, updatedAt: { $gte: since } } },
    { $unwind: '$messages' },
    {
      $match: {
        ...messages,
        'messages.role': ImageAgentRole.User,
        'messages.at': { $gte: since },
      },
    },
    { $count: 'count' },
  ]);
  return row?.count ?? 0;
}

/**
 * Who has sent a message since `since`, one key per person: their address
 * when it is known, so clearing cookies does not take a second place, and
 * their cookie's owner when it is not.
 */
async function callersSince(since: Date): Promise<string[]> {
  const rows = await ImageAgentThreads.aggregate<{ _id: string }>([
    { $match: { updatedAt: { $gte: since } } },
    { $unwind: '$messages' },
    { $match: { 'messages.role': ImageAgentRole.User, 'messages.at': { $gte: since } } },
    { $group: { _id: { $ifNull: ['$messages.addressKey', '$ownerGUID'] } } },
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
export async function allowanceFor(caller: Caller): Promise<Allowance> {
  const limit = perUserDailyLimit();
  const since = new Date(Date.now() - DAY_MS);
  const jobs = jobOf(caller);
  const threads = threadOf(caller);

  const [drawn, spokeAt, busy] = await Promise.all([
    jobs ? ImageAgentJobs.countDocuments({ ...jobs, createdAt: { $gte: since } }) : 0,
    lastMessageAt(caller),
    threads
      ? ImageAgentThreads.exists({ ...threads, status: { $ne: ImageAgentThreadStatus.Idle } })
      : null,
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
export async function assertWithinQuota(caller: Caller): Promise<void> {
  const since = new Date(Date.now() - DAY_MS);
  const hourAgo = new Date(Date.now() - HOUR_MS);

  const [allowance, spoken, spokenEverywhere, globalDrawn, recent] = await Promise.all([
    allowanceFor(caller),
    messagesSince(since, caller),
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

  const known = recent.includes(caller.address ?? '') || recent.includes(caller.ownerGUID ?? '');
  if (!known && recent.length >= hourlyCallers()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }

  if (spokenEverywhere >= globalDailyMessages()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }

  if (globalDrawn >= globalDailyLimit()) {
    throw TooManyRequests(UNAVAILABLE, extensions);
  }
}
