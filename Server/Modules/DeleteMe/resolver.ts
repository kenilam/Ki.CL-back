import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import { DeleteMeSchema } from './validation.js';
import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { PortfolioAccess } from 'server/DataSources/MongoDB/PortfolioAccess/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { clearAuthCookies } from 'server/Helpers/cookies.js';
import { forgetOwner } from 'server/Modules/ImageAgent/forget.js';
import { BadUserInput, Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

export default {
  Mutation: {
    DeleteMe: async (_: unknown, args: { DeleteMe: unknown }, context: Context) => {
      if (!context.user) {
        throw Unauthenticated('Authentication required');
      }

      const input = validate(DeleteMeSchema, args.DeleteMe);
      const { UserGUID } = context.user;

      const user = await Users.findOne({ UserGUID }, 'Password');

      if (!user) {
        throw Unauthenticated('User not found');
      }

      // The session alone isn't enough to delete an account.
      if (!(await bcrypt.compare(input.CurrentPassword, user.Password))) {
        throw BadUserInput('Password is incorrect');
      }

      /*
       * The tokens go first: if a later step fails, the session has still
       * ended. The user goes last, so they can sign in and try again.
       */
      await UserTokens.deleteMany({ UserGUID });
      await PasswordChanges.deleteMany({ UserGUID });
      await PortfolioAccess.deleteMany({ UserGUID });
      await Registrations.deleteMany({ UserGUID });
      // What they said to the image agent, and the pictures it drew for them.
      await forgetOwner(UserGUID);
      await Users.deleteOne({ UserGUID });

      clearAuthCookies(context.res);

      return true;
    },
  },
};
