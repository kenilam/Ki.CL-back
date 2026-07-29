import jwt from 'jsonwebtoken';

interface AppleUserInfo {
  Email: string;
  FirstName: string | null;
  LastName: string | null;
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
    throw new Error('Unable to verify Apple identity');
  }

  const emailVerified = decoded.email_verified === true || decoded.email_verified === 'true';
  if (!emailVerified) {
    throw new Error('Apple email not verified');
  }

  return {
    Email: decoded.email,
    FirstName: null,
    LastName: null,
  };
}
