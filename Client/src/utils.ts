/**
 * Read the `aud` cookie to determine session type.
 */
export function getSessionType(): 'anon' | 'user' | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(/(?:^|;\s*)aud=([^;]*)/);
  if (!match) return null;

  const value = match[1];
  if (value === 'anon' || value === 'user') return value;
  return null;
}

/**
 * Check if the user is authenticated (has a user session).
 */
export function isAuthenticated(): boolean {
  return getSessionType() === 'user';
}

/**
 * Check if any session exists (anon or user).
 */
export function hasSession(): boolean {
  return getSessionType() !== null;
}

/**
 * Read the non-httpOnly `x-api-key` cookie (playground / local bootstrap).
 */
export function getApiKey(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(/(?:^|;\s*)x-api-key=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
