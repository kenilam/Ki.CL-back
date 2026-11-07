import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import { DeleteMeSchema } from './validation.js';
import { ContactMessages } from 'server/DataSources/MongoDB/ContactMessages/Model.js';
import { Notifications } from 'server/DataSources/MongoDB/Notifications/Model.js';
import { PasswordChanges } from 'server/DataSources/MongoDB/PasswordChanges/Model.js';
import { PortfolioAccess } from 'server/DataSources/MongoDB/PortfolioAccess/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { clearAuthCookies } from 'server/Helpers/cookies.js';
import { forgetOwner } from 'server/DataSources/MongoDB/forgetImageAgentOwner.js';
import { BadUserInput, Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

export default {
  Mutation: {
    deleteMe: async (_: unknown, args: { deleteMe: unknown }, context: Context) => {
      if (!context.user) {
        throw Unauthenticated();
      }

      const input = validate(DeleteMeSchema, args.deleteMe);
      const { email, userGUID } = context.user;

      const user = await Users.findOne({ userGUID }, 'password');

      if (!user) {
        throw Unauthenticated(translate('api', 'error_user_not_found'));
      }

      // The session alone isn't enough to delete an account.
      if (!(await bcrypt.compare(input.currentPassword, user.password))) {
        throw BadUserInput(translate('api', 'error_password_incorrect'));
      }

      /*
       * The tokens go first: if a later step fails, the session has still
       * ended. The user goes last, so they can sign in and try again.
       */
      await UserTokens.deleteMany({ userGUID });
      await PasswordChanges.deleteMany({ userGUID });
      await Notifications.deleteMany({ ownerGUID: userGUID });
      await PortfolioAccess.deleteMany({ userGUID });
      await Registrations.deleteMany({ userGUID });
      // Messages sent from the contact form, signed in or under this address.
      await ContactMessages.deleteMany({ $or: [{ userGUID }, { email: email.toLowerCase() }] });
      // What they said to the image agent, and the pictures it drew for them.
      await forgetOwner(userGUID);
      await Users.deleteOne({ userGUID });

      clearAuthCookies(context.res);

      return true;
    },
  },
};
