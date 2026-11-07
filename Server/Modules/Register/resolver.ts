import { randomUUID } from 'node:crypto';
import { validate } from 'server/Helpers/Validation/validate.js';
import { RegisterSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { ExistingRecord } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

export default {
  Mutation: {
    register: async (_: unknown, args: { register: unknown }, context: Context) => {
      const input = validate(RegisterSchema, args.register);

      const existingUser = await Users.findOne({ email: input.email });
      if (existingUser) {
        throw ExistingRecord(translate('api', 'error_account_exists'));
      }

      const userGUID = randomUUID();
      const registrationGUID = randomUUID();
      const { password: secret } = await generatePassword();

      await Users.create({
        userGUID,
        email: input.email,
        password: input.password,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        active: false,
      });

      await Registrations.create({
        registrationGUID,
        secret,
        userGUID,
      });

      // TODO: Send activation email with Secret link
      // const link = `${process.env.MAILER_REGISTRATION_ACTIVATION_URL}?registrationGUID=${registrationGUID}&secret=${secret}&userGUID=${userGUID}`;

      // Issue user JWT (account not yet active, but cookie is set)
      const { accessToken, refreshToken } = await generateUserToken({
        userGUID,
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
