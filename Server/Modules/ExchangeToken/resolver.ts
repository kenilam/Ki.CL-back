import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import type { Context } from 'server/Context/index.js';

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

      // x-api-key already validated by authenticate middleware
      const UserGUID = uuid();

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
