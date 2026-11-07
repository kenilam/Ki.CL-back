import jwt from 'jsonwebtoken';
import { UserTokens } from './Model.js';
import type { TokenPayload } from 'server/Helpers/auth.js';
import { getAccessTokenExpiry, getRefreshTokenExpiry, secondsUntil } from 'server/Helpers/tokenExpiry.js';

/** `human` is carried into both tokens, so a refresh keeps it. */
type GenerateUserTokenProps = Pick<TokenPayload, 'userGUID' | 'human'> &
  Partial<Pick<TokenPayload, 'aud'>>;

export type UserTokenPayload = Pick<TokenPayload, 'userGUID' | 'aud'> & {
  accessToken: string;
  refreshToken: string;
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
    userGUID: props.userGUID,
    aud,
    ...(props.human ? { human: true } : {}),
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY!,
    { expiresIn: accessExpiresIn },
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_TOKEN_PRIVATE_KEY!,
    { expiresIn: refreshExpiresIn },
  );

  // Only store token records for authenticated users
  if (aud === 'user') {
    await UserTokens.deleteOne({ userGUID: props.userGUID });
    await UserTokens.create({
      userGUID: props.userGUID,
      token: refreshToken,
      createdAt: now,
      lastSignedInAt: now,
    });
  }

  return {
    accessToken,
    refreshToken,
    userGUID: props.userGUID,
    aud,
  };
}
