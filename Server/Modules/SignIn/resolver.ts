import bcrypt from 'bcrypt';
import { validate } from 'server/Helpers/Validation/validate.js';
import { SignInSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { BadUserInput, Forbidden } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

export default {
  Mutation: {
    signIn: async (_: unknown, args: { signIn: unknown }, context: Context) => {
      const input = validate(SignInSchema, args.signIn);

      const user = await Users.findOne(
        { email: input.email },
        'email password userGUID active',
      );

      if (!user) {
        throw BadUserInput(translate('api', 'error_credentials'));
      }

      if (!user.active) {
        throw Forbidden(translate('api', 'error_account_inactive'));
      }

      const isValidPassword = await bcrypt.compare(input.password, user.password);
      if (!isValidPassword) {
        throw BadUserInput(translate('api', 'error_credentials'));
      }

      const { accessToken, refreshToken } = await generateUserToken({
        userGUID: user.userGUID,
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
