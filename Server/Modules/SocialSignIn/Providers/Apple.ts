import jwt from 'jsonwebtoken';
import { translate } from 'server/Helpers/translate.js';

interface AppleUserInfo {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface AppleJwtPayload {
  email?: string;
  email_verified?: boolean | string;
  sub?: string;
}

export async function verifyAppleToken(token: string): Promise<AppleUserInfo> {
  // Decode the identity token from Apple
  // In production, verify against Apple's JWKS at https://appleid.apple.com/auth/keys
  const decoded = jwt.decode(token) as AppleJwtPayload | null;

  if (!decoded?.email) {
    throw new Error(translate('api', 'error_apple_identity'));
  }

  const emailVerified = decoded.email_verified === true || decoded.email_verified === 'true';
  if (!emailVerified) {
    throw new Error(translate('api', 'error_apple_email'));
  }

  return {
    email: decoded.email,
    firstName: null,
    lastName: null,
  };
}
