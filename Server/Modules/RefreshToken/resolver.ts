import jwt from 'jsonwebtoken';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie } from 'server/Helpers/cookies.js';
import { Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';
import { parseCookies, type TokenPayload } from 'server/Helpers/auth.js';

export default {
  Mutation: {
    RefreshToken: async (_: unknown, __: unknown, context: Context) => {
      // The refresh token comes from the cookie, not from a GraphQL input.
      const token = parseCookies(context.headers['cookie'] as string | undefined).refresh_token;

      if (!token) {
        throw Unauthenticated(translate('api', 'error_refresh_token_missing'));
      }

      let decoded: TokenPayload;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY!,
        ) as TokenPayload;
      } catch {
        throw Unauthenticated(translate('api', 'error_refresh_token_invalid'));
      }

      // For authenticated users, verify the token record exists
      if (decoded.aud === 'user') {
        const tokenRecord = await UserTokens.findOne({ Token: token });
        if (!tokenRecord) {
          throw Unauthenticated(translate('api', 'error_session_invalidated'));
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
