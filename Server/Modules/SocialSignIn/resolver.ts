import { randomUUID } from 'node:crypto';
import { validate } from 'server/Helpers/Validation/validate.js';
import { SocialSignInSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/UserTokens/generateUserToken.js';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { verifyGoogleToken } from './Providers/Google.js';
import { verifyAppleToken } from './Providers/Apple.js';
import { BadUserInput } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';
import { translate } from 'server/Helpers/translate.js';

interface SocialUserInfo {
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar?: string | null;
}

async function getProviderUserInfo(provider: string, token: string): Promise<SocialUserInfo> {
  switch (provider) {
    case 'google':
      return verifyGoogleToken(token);
    case 'apple':
      return verifyAppleToken(token);
    default:
      throw BadUserInput(translate('api', 'error_provider_unsupported', { provider }));
  }
}

export default {
  Mutation: {
    socialSignIn: async (_: unknown, args: { socialSignIn: unknown }, context: Context) => {
      const input = validate(SocialSignInSchema, args.socialSignIn);

      const userInfo = await getProviderUserInfo(input.provider, input.token);

      let user = await Users.findOne({ email: userInfo.email });

      if (!user) {
        const userGUID = randomUUID();
        const { hash: password } = await generatePassword();

        user = await Users.create({
          userGUID,
          email: userInfo.email,
          password,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          avatar: userInfo.avatar || null,
          active: true,
          socialProviders: [
            { provider: input.provider, providerId: userInfo.email },
          ],
        });
      } else {
        const hasProvider = user.socialProviders?.some(
          (sp) => sp.provider === input.provider,
        );

        if (!hasProvider) {
          await Users.updateOne(
            { _id: user._id },
            {
              $push: {
                socialProviders: { provider: input.provider, providerId: userInfo.email },
              },
              $set: { active: true },
            },
          );
        }
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
