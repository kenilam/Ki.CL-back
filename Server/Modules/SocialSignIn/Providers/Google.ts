import { translate } from 'server/Helpers/translate.js';

interface GoogleUserInfo {
  Email: string;
  FirstName: string | null;
  LastName: string | null;
  Avatar: string | null;
}

export async function verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(translate('api', 'error_google_token'));
  }

  const data = await response.json() as {
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  if (!data.email || !data.email_verified) {
    throw new Error(translate('api', 'error_google_email'));
  }

  return {
    Email: data.email,
    FirstName: data.given_name || null,
    LastName: data.family_name || null,
    Avatar: data.picture || null,
  };
}
