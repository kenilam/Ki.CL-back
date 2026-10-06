import { validate } from 'server/Helpers/Validation/validate.js';
import { UpdateMeSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Unauthenticated } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

export default {
  Mutation: {
    // The password has its own module, `PasswordChange`, because it is confirmed by email.
    UpdateMe: async (_: unknown, args: { UpdateMe: unknown }, context: Context) => {
      if (!context.user) {
        throw Unauthenticated('Authentication required');
      }

      const input = validate(UpdateMeSchema, args.UpdateMe);

      const user = await Users.findOne({ UserGUID: context.user.UserGUID, Active: true });

      if (!user) {
        throw Unauthenticated('User not found');
      }

      // A field left out is kept. An empty one is cleared.
      if (input.FirstName !== undefined) {
        user.FirstName = input.FirstName || null;
      }

      if (input.LastName !== undefined) {
        user.LastName = input.LastName || null;
      }

      await user.save();

      return true;
    },
  },
};
