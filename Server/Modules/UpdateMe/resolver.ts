import { validate } from 'server/Helpers/Validation/validate.js';
import { UpdateMeSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

export default {
  Mutation: {
    // The password has its own module, `PasswordChange`, because it is confirmed by email.
    updateMe: async (_: unknown, args: { updateMe: unknown }, context: Context) => {
      if (!context.user) {
        throw Unauthenticated();
      }

      const input = validate(UpdateMeSchema, args.updateMe);

      const user = await Users.findOne({ userGUID: context.user.userGUID, active: true });

      if (!user) {
        throw Unauthenticated(translate('api', 'error_user_not_found'));
      }

      // A field left out is kept. An empty one is cleared.
      if (input.firstName !== undefined) {
        user.firstName = input.firstName || null;
      }

      if (input.lastName !== undefined) {
        user.lastName = input.lastName || null;
      }

      await user.save();

      return true;
    },
  },
};
