import { v4 as uuid } from 'uuid';
import { validate } from 'server/Helpers/Validation/validate.js';
import { SocialSignInSchema } from './validation.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { generateUserToken } from 'server/DataSources/MongoDB/Utilities/generateUserToken.js';
import { generatePassword } from 'server/DataSources/MongoDB/Utilities/generatePassword.js';
import { setAccessTokenCookie, setRefreshTokenCookie, setAudCookie, clearApiKeyCookie } from 'server/Helpers/cookies.js';
import { verifyGoogleToken } from './Providers/Google.js';
import { verifyAppleToken } from './Providers/Apple.js';
import { BadUserInput } from 'server/Errors/index.js';
import type { Context } from 'server/Context/index.js';

interface SocialUserInfo {
  Email: string;
  FirstName: string | null;
  LastName: string | null;
  Avatar?: string | null;
}

async function getProviderUserInfo(provider: string, token: string): Promise<SocialUserInfo> {
  switch (provider) {
    case 'google':
      return verifyGoogleToken(token);
    case 'apple':
      return verifyAppleToken(token);
    default:
      throw BadUserInput(`Unsupported provider: ${provider}`);
  }
}

export default {
  Mutation: {
    SocialSignIn: async (_: unknown, args: { SocialSignIn: unknown }, context: Context) => {
      const input = validate(SocialSignInSchema, args.SocialSignIn);

      const userInfo = await getProviderUserInfo(input.Provider, input.Token);

      let user = await Users.findOne({ Email: userInfo.Email });

      if (!user) {
        const UserGUID = uuid();
        const { hash: Password } = await generatePassword();

        user = await Users.create({
          UserGUID,
          Email: userInfo.Email,
          Password,
          FirstName: userInfo.FirstName,
          LastName: userInfo.LastName,
          Avatar: userInfo.Avatar || null,
          Active: true,
          SocialProviders: [
            { Provider: input.Provider, ProviderId: userInfo.Email },
          ],
        });
      } else {
        const hasProvider = user.SocialProviders?.some(
          (sp) => sp.Provider === input.Provider,
        );

        if (!hasProvider) {
          await Users.updateOne(
            { _id: user._id },
            {
              $push: {
                SocialProviders: { Provider: input.Provider, ProviderId: userInfo.Email },
              },
              $set: { Active: true },
            },
          );
        }
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
