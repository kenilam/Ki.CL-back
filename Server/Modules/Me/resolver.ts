import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

export default {
  Query: {
    me: async (_: unknown, __: unknown, context: Context) => {
      if (!context.tokenPayload) {
        throw Unauthenticated();
      }

      // Anonymous tokens get minimal info
      if (context.tokenPayload.aud === 'anon') {
        return {
          userGUID: context.tokenPayload.userGUID,
          email: null,
          firstName: null,
          lastName: null,
          avatar: null,
          active: false,
          aud: 'anon',
        };
      }

      /*
       * A signed JWT isn't enough for a user: `context.user` also needs their
       * stored token, which signing out or revoking deletes. Without it the
       * access token would keep working until it expires at midnight.
       */
      if (!context.user) {
        throw Unauthenticated(translate('api', 'error_session_ended'));
      }

      // Authenticated users get their own profile
      const user = await Users.findOne(
        { userGUID: context.tokenPayload.userGUID, active: true },
        'userGUID email firstName lastName avatar active',
      );

      if (!user) {
        throw Unauthenticated(translate('api', 'error_user_not_found'));
      }

      return {
        userGUID: user.userGUID,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        active: user.active,
        aud: 'user',
      };
    },
  },
};
