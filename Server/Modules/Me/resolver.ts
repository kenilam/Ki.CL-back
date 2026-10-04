import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

export default {
  Query: {
    Me: async (_: unknown, __: unknown, context: Context) => {
      if (!context.tokenPayload) {
        throw Unauthenticated('Authentication required');
      }

      // Anonymous tokens get minimal info
      if (context.tokenPayload.aud === 'anon') {
        return {
          UserGUID: context.tokenPayload.UserGUID,
          Email: null,
          FirstName: null,
          LastName: null,
          Avatar: null,
          Active: false,
          aud: 'anon',
        };
      }

      /*
       * A signed JWT isn't enough for a user: `context.user` also needs their
       * stored token, which signing out or revoking deletes. Without it the
       * access token would keep working until it expires at midnight.
       */
      if (!context.user) {
        throw Unauthenticated('Session ended');
      }

      // Authenticated users get their own profile
      const user = await Users.findOne(
        { UserGUID: context.tokenPayload.UserGUID, Active: true },
        'UserGUID Email FirstName LastName Avatar Active',
      );

      if (!user) {
        throw Unauthenticated('User not found');
      }

      return {
        UserGUID: user.UserGUID,
        Email: user.Email,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Avatar: user.Avatar,
        Active: user.Active,
        aud: 'user',
      };
    },
  },
};
