import type { ExpressContextFunctionArgument } from '@as-integrations/express5';
import type { Response } from 'express';
import type { IncomingMessage } from 'node:http';
import { Users } from 'server/DataSources/MongoDB/Users/Model.js';
import { UserTokens } from 'server/DataSources/MongoDB/UserTokens/Model.js';
import {
  createAssetLoaders,
  type AssetLoaders,
} from 'server/DataSources/MongoDB/Assets/loaders.js';
import {
  createTreeOfLifeLoaders,
  type TreeOfLifeLoaders,
} from 'server/DataSources/MongoDB/TreeOfLife/loaders.js';
import { parseCookies, verifyAccessToken, type TokenPayload } from 'server/Helpers/auth.js';

export interface AuthenticatedUser {
  UserGUID: string;
  Email: string;
  Active: boolean;
}

export interface Context {
  headers: Record<string, string | string[] | undefined>;
  ip: string | undefined;
  /** Present for HTTP; absent for WebSocket (subscriptions cannot set cookies). */
  res: Response | null;
  user: AuthenticatedUser | null;
  operationName: string | undefined;
  isWhitelisted: boolean;
  tokenPayload: { UserGUID: string; aud: 'anon' | 'user' } | null;
  loaders: {
    treeOfLife: TreeOfLifeLoaders;
    asset: AssetLoaders;
  };
}

function createLoaders() {
  return {
    treeOfLife: createTreeOfLifeLoaders(),
    asset: createAssetLoaders(),
  };
}

async function resolveUser(
  tokenPayload: TokenPayload | null,
): Promise<AuthenticatedUser | null> {
  if (tokenPayload?.aud !== 'user') return null;

  const userRecord = await Users.findOne(
    { UserGUID: tokenPayload.UserGUID, Active: true },
    'UserGUID Email Active',
  );

  if (!userRecord) return null;

  const tokenRecord = await UserTokens.findOne({ UserGUID: tokenPayload.UserGUID });
  if (!tokenRecord) return null;

  return {
    UserGUID: userRecord.UserGUID,
    Email: userRecord.Email,
    Active: userRecord.Active,
  };
}

export async function createContext({ req, res }: ExpressContextFunctionArgument): Promise<Context> {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const ip = req.ip;
  const operationName = req.body?.operationName;

  /*
   * The middleware only attaches the payload on the path that requires a token.
   * Every client operation includes `__typename`, which the introspection check
   * matches as `__type`, so on `/api` that path is never taken. Resolvers then
   * couldn't tell who was calling, even with a valid cookie. Read the cookie
   * here too, the way the WebSocket context already does.
   */
  const tokenPayload =
    req.tokenPayload || verifyAccessToken(req.cookies?.access_token) || null;

  const isWhitelisted = !tokenPayload;

  const user = await resolveUser(tokenPayload);

  return {
    headers,
    ip,
    res: res as unknown as Response,
    user,
    operationName,
    isWhitelisted,
    tokenPayload,
    loaders: createLoaders(),
  };
}

/**
 * Build GraphQL context for graphql-ws connections.
 * Auth comes from Cookie header on the upgrade request, or from connectionParams.
 */
export async function createWsContext(args: {
  connectionParams?: Record<string, unknown> | undefined;
  request?: IncomingMessage;
}): Promise<Context> {
  const { connectionParams, request } = args;

  const headerCookie =
    typeof request?.headers.cookie === 'string' ? request.headers.cookie : undefined;
  const paramCookie =
    typeof connectionParams?.cookie === 'string'
      ? connectionParams.cookie
      : typeof connectionParams?.Cookie === 'string'
        ? connectionParams.Cookie
        : undefined;

  const cookies = parseCookies(headerCookie || paramCookie);

  const accessToken =
    cookies.access_token ||
    (typeof connectionParams?.access_token === 'string'
      ? connectionParams.access_token
      : undefined);

  const tokenPayload = verifyAccessToken(accessToken);
  const user = await resolveUser(tokenPayload);

  const headers: Record<string, string | string[] | undefined> = {
    ...(request?.headers as Record<string, string | string[] | undefined>),
  };
  if (headerCookie || paramCookie) {
    headers.cookie = headerCookie || paramCookie;
  }

  const ip =
    typeof request?.headers['x-forwarded-for'] === 'string'
      ? request.headers['x-forwarded-for'].split(',')[0]?.trim()
      : request?.socket?.remoteAddress;

  return {
    headers,
    ip,
    res: null,
    user,
    operationName: undefined,
    isWhitelisted: !tokenPayload,
    tokenPayload,
    loaders: createLoaders(),
  };
}
