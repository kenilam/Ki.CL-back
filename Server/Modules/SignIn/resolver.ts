import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import { SignInSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { BadUserInput, Forbidden } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

export default {
  Mutation: {
    SignIn: async (_: unknown, args: { SignIn: unknown }, context: Context) => {
      const input = validate(SignInSchema, args.SignIn);

      const user = await Users.findOne(
        { Email: input.Email },
        'Email Password UserGUID Active',
      );

      if (!user) {
        throw BadUserInput('Invalid email or password');
      }

      if (!user.Active) {
        throw Forbidden('Account is not activated. Please check your email.');
      }

      const isValidPassword = await bcrypt.compare(input.Password, user.Password);
      if (!isValidPassword) {
        throw BadUserInput('Invalid email or password');
      }

      const { AccessToken, RefreshToken } = await generateUserToken({
        UserGUID: user.UserGUID,
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
