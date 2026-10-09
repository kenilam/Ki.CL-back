import { ContactMessages } from 'server/DataSources/MongoDB/ContactMessages/Model.js';
import { TooManyRequests } from 'server/Errors/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Days a message is kept before Mongo removes it. */
export function retentionMs(): number {
  return envNumber('CONTACT_RETENTION_DAYS', 90) * DAY_MS;
}

/**
 * Throws TOO_MANY_REQUESTS when no more messages may be sent today.
 *
 * Counted per session, per address and overall. The address has its own
 * limit because each message sends it an acknowledgement, and a new session
 * must not be a way to send someone more of those. One message for every
 * limit, so it does not say which one was reached.
 */
export async function assertWithinQuota(input: { UserGUID: string; Email: string }): Promise<void> {
  const createdAt = { $gte: new Date(Date.now() - DAY_MS) };

  const [fromSession, toAddress, overall] = await Promise.all([
    ContactMessages.countDocuments({ UserGUID: input.UserGUID, createdAt }),
    ContactMessages.countDocuments({ Email: input.Email, createdAt }),
    ContactMessages.countDocuments({ createdAt }),
  ]);

  if (
    fromSession >= envNumber('CONTACT_DAILY_LIMIT_PER_USER', 3) ||
    toAddress >= envNumber('CONTACT_DAILY_LIMIT_PER_EMAIL', 3) ||
    overall >= envNumber('CONTACT_DAILY_LIMIT_GLOBAL', 50)
  ) {
    throw TooManyRequests('No more messages can be sent today. Try again tomorrow.');
  }
}
