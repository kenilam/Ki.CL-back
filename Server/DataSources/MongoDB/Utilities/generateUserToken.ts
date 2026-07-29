import jwt from 'jsonwebtoken';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { getAccessTokenExpiry, getRefreshTokenExpiry, secondsUntil } from 'server/Helpers/tokenExpiry.js';
import { rateLimitStore } from 'server/Middleware/rateLimit.js';

interface GenerateUserTokenProps {
  UserGUID: string;
  aud?: 'anon' | 'user';
}

export interface UserTokenPayload {
  AccessToken: string;
  RefreshToken: string;
  UserGUID: string;
  aud: 'anon' | 'user';
}

export async function generateUserToken(
  props: GenerateUserTokenProps,
): Promise<UserTokenPayload> {
  const aud = props.aud || 'user';
  const now = new Date();

  const accessExpiry = getAccessTokenExpiry(now);
  const refreshExpiry = getRefreshTokenExpiry(now);

  const accessExpiresIn = secondsUntil(accessExpiry, now);
  const refreshExpiresIn = secondsUntil(refreshExpiry, now);

  const payload = { UserGUID: props.UserGUID, aud };

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

  // Reset rate limit on token issuance/refresh
  const maxRequests = Number(process.env.RATE_LIMIT_PER_DAY) || 100;
  rateLimitStore.set(props.UserGUID, { remaining: maxRequests });

  return {
    AccessToken,
    RefreshToken,
    UserGUID: props.UserGUID,
    aud,
  };
}
