/**
 * Token expiry logic:
 * - Access token expires at next midnight (00:00)
 * - If created/refreshed at or after 11:45 PM, expires day-after-tomorrow at 00:00
 * - Refresh token expires on the 8th day at midnight (same 11:45 PM grace rule)
 */

const GRACE_MINUTES = 15; // 11:45 PM = 23:45 = 60 - 15 minutes before midnight

function getNextMidnight(fromDate: Date = new Date()): Date {
  const midnight = new Date(fromDate);
  midnight.setHours(0, 0, 0, 0);
  midnight.setDate(midnight.getDate() + 1);
  return midnight;
}

function isAfterGracePeriod(date: Date): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  // 23:45 or later
  return hours === 23 && minutes >= (60 - GRACE_MINUTES);
}

export function getAccessTokenExpiry(now: Date = new Date()): Date {
  const midnight = getNextMidnight(now);

  if (isAfterGracePeriod(now)) {
    // Push to day-after-tomorrow midnight
    midnight.setDate(midnight.getDate() + 1);
  }

  return midnight;
}

export function getRefreshTokenExpiry(now: Date = new Date()): Date {
  const midnight = getNextMidnight(now);

  // 8th day at midnight (7 more days from next midnight)
  midnight.setDate(midnight.getDate() + 7);

  if (isAfterGracePeriod(now)) {
    // Push to 9th day midnight
    midnight.setDate(midnight.getDate() + 1);
  }

  return midnight;
}

/**
 * Returns seconds until the given expiry date (for JWT `expiresIn`).
 */
export function secondsUntil(expiry: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
}
