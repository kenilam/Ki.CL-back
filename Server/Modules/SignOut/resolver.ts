import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { clearAuthCookies } from 'server/Helpers/cookies.js';
import type { Context } from 'server/Context/index.js';

export default {
  Mutation: {
    signOut: async (_: unknown, __: unknown, context: Context) => {
      if (context.tokenPayload?.aud === 'user') {
        await UserTokens.deleteOne({ userGUID: context.tokenPayload.userGUID });
      }

      clearAuthCookies(context.res);

      return true;
    },
  },
};
