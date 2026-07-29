import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import { ActivateSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { BadUserInput, NotFound } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

export default {
  Mutation: {
    Activate: async (_: unknown, args: { Activate: unknown }, context: Context) => {
      const input = validate(ActivateSchema, args.Activate);

      const registration = await Registrations.findOne({
        RegistrationGUID: input.RegistrationGUID,
        UserGUID: input.UserGUID,
      });

      if (!registration) {
        throw NotFound('Registration not found');
      }

      const isValidSecret = await bcrypt.compare(input.Secret, registration.Secret);
      if (!isValidSecret) {
        throw BadUserInput('Invalid activation secret');
      }

      const user = await Users.findOne({ UserGUID: input.UserGUID });
      if (!user) {
        throw NotFound('User not found');
      }

      if (user.Active) {
        throw BadUserInput('Account is already activated');
      }

      await Users.updateOne(
        { UserGUID: input.UserGUID },
        { Active: true },
      );

      await Registrations.deleteOne({ RegistrationGUID: input.RegistrationGUID });

      const { AccessToken, RefreshToken } = await generateUserToken({
        UserGUID: input.UserGUID,
        aud: 'user',
      });

      setAccessTokenCookie(context.res, AccessToken);
      setRefreshTokenCookie(context.res, RefreshToken);
      setAudCookie(context.res, 'user');
      clearApiKeyCookie(context.res);

      return true;
    },
  },
};
