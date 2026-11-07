import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import { ActivateSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/UserTokens/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { BadUserInput, NotFound } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

export default {
  Mutation: {
    activate: async (_: unknown, args: { activate: unknown }, context: Context) => {
      const input = validate(ActivateSchema, args.activate);

      const registration = await Registrations.findOne({
        registrationGUID: input.registrationGUID,
        userGUID: input.userGUID,
      });

      if (!registration) {
        throw NotFound(translate('api', 'error_registration_not_found'));
      }

      const isValidSecret = await bcrypt.compare(input.secret, registration.secret);
      if (!isValidSecret) {
        throw BadUserInput(translate('api', 'error_activation_secret'));
      }

      const user = await Users.findOne({ userGUID: input.userGUID });
      if (!user) {
        throw NotFound(translate('api', 'error_user_not_found'));
      }

      if (user.active) {
        throw BadUserInput(translate('api', 'error_account_active'));
      }

      await Users.updateOne(
        { userGUID: input.userGUID },
        { active: true },
      );

      await Registrations.deleteOne({ registrationGUID: input.registrationGUID });

      const { accessToken, refreshToken } = await generateUserToken({
        userGUID: input.userGUID,
        aud: 'user',
      });

      setAccessTokenCookie(context.res, accessToken);
      setRefreshTokenCookie(context.res, refreshToken);
      setAudCookie(context.res, 'user');
      clearApiKeyCookie(context.res);

      return true;
    },
  },
};
