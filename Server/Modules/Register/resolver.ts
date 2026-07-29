import { v4 as uuid } from 'uuid';
import { validate } from 'server/Helpers/Validation/validate.js';
import { RegisterSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { Registrations } from 'server/DataSources/MongoDB/Registrations/Model.js';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { ExistingRecord } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

export default {
  Mutation: {
    Register: async (_: unknown, args: { Register: unknown }, context: Context) => {
      const input = validate(RegisterSchema, args.Register);

      const existingUser = await Users.findOne({ Email: input.Email });
      if (existingUser) {
        throw ExistingRecord('An account with this email already exists');
      }

      const UserGUID = uuid();
      const RegistrationGUID = uuid();
      const { password: Secret } = await generatePassword();

      await Users.create({
        UserGUID,
        Email: input.Email,
        Password: input.Password,
        FirstName: input.FirstName || null,
        LastName: input.LastName || null,
        Active: false,
      });

      await Registrations.create({
        RegistrationGUID,
        Secret,
        UserGUID,
      });

      // TODO: Send activation email with Secret link
      // const link = `${process.env.MAILER_REGISTRATION_ACTIVATION_URL}?RegistrationGUID=${RegistrationGUID}&Secret=${Secret}&UserGUID=${UserGUID}`;

      // Issue user JWT (account not yet active, but cookie is set)
      const { AccessToken, RefreshToken } = await generateUserToken({
        UserGUID,
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
