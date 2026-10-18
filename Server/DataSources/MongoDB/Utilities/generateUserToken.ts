import jwt from 'jsonwebtoken';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import type { TokenPayload } from 'server/Helpers/auth.js';
import { getAccessTokenExpiry, getRefreshTokenExpiry, secondsUntil } from 'server/Helpers/tokenExpiry.js';

/** `human` is carried into both tokens, so a refresh keeps it. */
type GenerateUserTokenProps = Pick<TokenPayload, 'UserGUID' | 'human'> &
  Partial<Pick<TokenPayload, 'aud'>>;

export type UserTokenPayload = Pick<TokenPayload, 'UserGUID' | 'aud'> & {
  AccessToken: string;
  RefreshToken: string;
};

export async function generateUserToken(
  props: GenerateUserTokenProps,
): Promise<UserTokenPayload> {
  const aud = props.aud || 'user';
  const now = new Date();

  const accessExpiry = getAccessTokenExpiry(now);
  const refreshExpiry = getRefreshTokenExpiry(now);

  const accessExpiresIn = secondsUntil(accessExpiry, now);
  const refreshExpiresIn = secondsUntil(refreshExpiry, now);

  const payload = {
    UserGUID: props.UserGUID,
    aud,
    ...(props.human ? { human: true } : {}),
  };

  const AccessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY!,
    { expiresIn: accessExpiresIn },
  );

  const RefreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY!,
    { expiresIn: refreshExpiresIn },
  );

  // Only store token records for authenticated users
  if (aud === 'user') {
    await UserTokens.deleteOne({ UserGUID: props.UserGUID });
    await UserTokens.create({
      UserGUID: props.UserGUID,
      Token: RefreshToken,
      CreatedAt: now,
      LastSignedInAt: now,
    });
  }

  return {
    AccessToken,
    RefreshToken,
    UserGUID: props.UserGUID,
    aud,
  };
}
