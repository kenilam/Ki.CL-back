import type { Response, CookieOptions } from 'express';
import { getAccessTokenExpiry, getRefreshTokenExpiry } from './tokenExpiry.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getBaseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/',
  };
}

export function setAccessTokenCookie(res: Response | null, token: string): void {
  if (!res) return;
  const expiry = getAccessTokenExpiry();

  res.cookie('access_token', token, {
    ...getBaseCookieOptions(),
    expires: expiry,
  });
}

export function setRefreshTokenCookie(res: Response | null, token: string): void {
  if (!res) return;
  const expiry = getRefreshTokenExpiry();

  res.cookie('refresh_token', token, {
    ...getBaseCookieOptions(),
    expires: expiry,
  });
}

export function setAudCookie(res: Response | null, aud: 'anon' | 'user'): void {
  if (!res) return;
  const expiry = getAccessTokenExpiry();

  res.cookie('aud', aud, {
    httpOnly: false, // Frontend needs to read this
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/',
    expires: expiry,
  });
}

export function clearAuthCookies(res: Response | null): void {
  if (!res) return;
  const opts: CookieOptions = {
    path: '/',
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
  };

  res.clearCookie('access_token', opts);
  res.clearCookie('refresh_token', opts);
  res.clearCookie('aud', opts);
}

export function clearApiKeyCookie(res: Response | null): void {
  if (!res) return;
  res.clearCookie('x-api-key', {
    path: '/',
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
  });
}
