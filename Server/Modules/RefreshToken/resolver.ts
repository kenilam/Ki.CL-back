import jwt from 'jsonwebtoken';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import { Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

interface RefreshPayload {
  UserGUID: string;
  aud: 'anon' | 'user';
  /** Carried over, so a refresh does not send the visitor back to the check. */
  human?: boolean;
  iat: number;
  exp: number;
}

export default {
  Mutation: {
    RefreshToken: async (_: unknown, __: unknown, context: Context) => {
      // The refresh token comes from the cookie, not from a GraphQL input.
      const cookieHeader = context.headers['cookie'] as string | undefined;
      let token: string | undefined;

      if (cookieHeader) {
        const match = cookieHeader.match(/refresh_token=([^;]+)/);
        token = match?.[1];
      }

      if (!token) {
        throw Unauthenticated('Refresh token not found');
      }

      let decoded: RefreshPayload;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY!,
        ) as RefreshPayload;
      } catch {
        throw Unauthenticated('Refresh token expired or invalid');
      }

      // For authenticated users, verify the token record exists
      if (decoded.aud === 'user') {
        const tokenRecord = await UserTokens.findOne({ Token: token });
        if (!tokenRecord) {
          throw Unauthenticated('Session invalidated. Please sign in again.');
        }
      }

      // Issue new tokens
      const { AccessToken, RefreshToken: NewRefreshToken } = await generateUserToken({
        UserGUID: decoded.UserGUID,
        aud: decoded.aud,
        human: decoded.human,
      });

      setAccessTokenCookie(context.res, AccessToken);
      setRefreshTokenCookie(context.res, NewRefreshToken);
      setAudCookie(context.res, decoded.aud);

      return true;
    },
  },
};
