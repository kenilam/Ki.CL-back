import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import type { Context } from 'server/Context/index.js';
import { CaptchaRequired, Unavailable } from 'server/Errors/index.js';
import { parseCookies } from 'server/Helpers/auth.js';
import { turnstileToken, verifyTurnstile } from 'server/Helpers/turnstile.js';

/** Must match the `action` the client renders the widget with. */
const TURNSTILE_ACTION = 'exchange-token';

const LOG = '[ExchangeToken]';

type Identity = {
  UserGUID: string;
  aud: 'anon' | 'user';
  /** Passed the Turnstile check. Paid operations require it. */
  human?: boolean;
};

function verify(token: string | undefined, key: string): Identity | null {
  if (!token) return null;
  try {
    const { UserGUID, aud, human } = jwt.verify(token, key) as Identity;
    return { UserGUID, aud, human };
  } catch {
    return null;
  }
}

/**
 * Whether the visitor passed the check. A forged, spent or missing token
 * throws. When Cloudflare cannot answer, or no secret is set in production,
 * this is false and the caller decides what that means.
 */
async function passedTurnstile(context: Pick<Context, 'headers'>): Promise<boolean> {
  const verdict = await verifyTurnstile({
    token: turnstileToken(context.headers),
    action: TURNSTILE_ACTION,
  });

  if (verdict.ok) return true;

  if (verdict.reason === 'rejected') {
    console.log(`${LOG} Turnstile rejected: ${verdict.codes.join(',')}`);
    throw CaptchaRequired();
  }

  console.warn(`${LOG} Turnstile unavailable: ${verdict.codes.join(',')}`);
  return false;
}

async function issue(context: Pick<Context, 'headers' | 'res'>, identity: Identity): Promise<void> {
  const { AccessToken, RefreshToken } = await generateUserToken(identity);

  setAccessTokenCookie(context.res, AccessToken);
  setRefreshTokenCookie(context.res, RefreshToken);
  setAudCookie(context.res, identity.aud);
}

/**
 * Gives the caller a session: keeps the one they have (marking it human when a
 * Turnstile token comes along), renews an anonymous one from its refresh
 * token, or starts a new anonymous one. Resolves to whether cookies were set.
 * Throws CAPTCHA_REQUIRED or SERVICE_UNAVAILABLE.
 *
 * x-api-key or the BFF has already let the request in. The Turnstile check is
 * the only gate on a new identity: it is what stops a script from minting
 * sessions to get round the per-session limits.
 */
export async function exchangeToken(context: Pick<Context, 'headers' | 'res'>): Promise<boolean> {
  const cookies = parseCookies(context.headers['cookie'] as string | undefined);

  /*
   * A user's session also needs its stored token, which signing out or
   * revoking deletes. Without it the signed cookies don't count.
   */
  const verified = verify(cookies.access_token, process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY!);
  const current =
    verified?.aud === 'user' && !(await UserTokens.exists({ UserGUID: verified.UserGUID }))
      ? null
      : verified;
  if (current) {
    /*
     * The session stands. The one thing left to do is mark it human when
     * a Turnstile token came along: a paid operation refused with
     * CAPTCHA_REQUIRED sends the visitor back here with one.
     */
    if (current.human || !turnstileToken(context.headers)) {
      return false;
    }
    if (!(await passedTurnstile(context))) {
      throw Unavailable('Could not confirm you are human right now. Try again later.');
    }
    await issue(context, { ...current, human: true });
    return true;
  }

  /*
   * The access token lapses every midnight. A visitor whose refresh token
   * is still valid keeps their identity, so their conversations and
   * allowance stay theirs, instead of being handed a new one. A signed-in
   * user stays signed in, as long as their refresh token is the one stored
   * for them; a revoked one falls through to a new anonymous session.
   */
  const refreshed = verify(cookies.refresh_token, process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY!);
  const renewable =
    refreshed?.aud === 'anon' ||
    (refreshed?.aud === 'user' && Boolean(await UserTokens.exists({ Token: cookies.refresh_token })));
  if (refreshed && renewable) {
    await issue(context, refreshed);
    return true;
  }

  /*
   * When the check cannot run, the visitor still gets a session, without
   * `human`. Every request needs a token, so refusing here would take the
   * whole site down for new visitors. Paid operations refuse a session
   * without `human`, and the visitor comes back here to earn it.
   */
  const human = await passedTurnstile(context);
  await issue(context, { UserGUID: uuid(), aud: 'anon', human });
  return true;
}
