import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import type { Context } from 'server/Context/index.js';
import { AnonymousSessions } from 'server/DataSources/MongoDB/AnonymousSessions/Model.js';
import { TooManyRequests } from 'server/Errors/index.js';
import { addressKey } from 'server/Helpers/clientAddress.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Anonymous identities one address may be given in a rolling day. */
function perAddressDailyLimit(): number {
  const value = Number(process.env.ANONYMOUS_SESSIONS_PER_ADDRESS_PER_DAY);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

export default {
  Mutation: {
    ExchangeToken: async (_: unknown, __: unknown, context: Context) => {
      // If user already has a valid JWT, no-op
      const existingToken = context.headers['cookie']
        ? (context.headers['cookie'] as string).match(/access_token=([^;]+)/)?.[1]
        : undefined;

      if (existingToken) {
        try {
          jwt.verify(existingToken, process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY!);
          return false; // Already authenticated, nothing to do
        } catch {
          // Token invalid/expired, proceed to issue a new one
        }
      }

      /*
       * The access token lapses every midnight. A visitor whose refresh token
       * is still valid keeps their identity, so their conversations and
       * allowance stay theirs, instead of being handed a new one.
       */
      const refreshToken = context.headers['cookie']
        ? (context.headers['cookie'] as string).match(/refresh_token=([^;]+)/)?.[1]
        : undefined;

      if (refreshToken) {
        try {
          const { UserGUID, aud } = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY!,
          ) as { UserGUID: string; aud: 'anon' | 'user' };

          if (aud === 'anon') {
            const renewed = await generateUserToken({ UserGUID, aud });

            setAccessTokenCookie(context.res, renewed.AccessToken);
            setRefreshTokenCookie(context.res, renewed.RefreshToken);
            setAudCookie(context.res, aud);

            return true;
          }
        } catch {
          // Expired or invalid too: start a new identity below.
        }
      }

      // x-api-key already validated by authenticate middleware
      const address = addressKey(context.ip);
      if (address) {
        const issued = await AnonymousSessions.countDocuments({
          addressKey: address,
          createdAt: { $gte: new Date(Date.now() - DAY_MS) },
        });
        if (issued >= perAddressDailyLimit()) {
          // Vague on purpose: naming the limit says how to get round it.
          throw TooManyRequests('Could not start a session right now. Try again later.');
        }
      }

      const UserGUID = uuid();
      if (address) {
        await AnonymousSessions.create({ addressKey: address, UserGUID });
      }

      const { AccessToken, RefreshToken } = await generateUserToken({
        UserGUID,
        aud: 'anon',
      });

      setAccessTokenCookie(context.res, AccessToken);
      setRefreshTokenCookie(context.res, RefreshToken);
      setAudCookie(context.res, 'anon');

      return true;
    },
  },
};
