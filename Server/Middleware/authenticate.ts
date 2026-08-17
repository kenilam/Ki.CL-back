import type { Request, Response, NextFunction } from 'express';
import { checkRateLimit, setRateLimitHeaders } from './rateLimit.js';
import { generateApiKey, setApiKeyCookie } from 'server/Helpers/apiKey.js';
import {
  isAuthOperation,
  isWhitelistedRequest,
  isIntrospectionRequest,
  OPERATION_PREFIX,
} from 'server/Helpers/graphqlOperations.js';
import {
  validateApiKey,
  verifyAccessToken,
  type TokenPayload,
} from 'server/Helpers/auth.js';

declare global {
  namespace Express {
    interface Request {
      tokenPayload?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Allow GET requests through (Playground HTML page)
  if (req.method === 'GET') {
    next();
    return;
  }

  // Allow introspection through without prefix or auth
  if (isIntrospectionRequest(req.body)) {
    // Public BFF must never expose x-api-key to the browser
    if (req.baseUrl === '/api') {
      next();
      return;
    }

    const existingKey = req.cookies?.['x-api-key'] as string | undefined;

    // If client already has a valid key, re-set the same one (refresh the cookie expiry)
    if (existingKey && validateApiKey(existingKey)) {
      setApiKeyCookie(res, existingKey);
    } else {
      // Issue a new key
      const apiKey = generateApiKey();
      if (apiKey) {
        setApiKeyCookie(res, apiKey);
      }
    }

    next();
    return;
  }

  // Require kicl_ prefix on operation name
  const operationName = req.body?.operationName as string | undefined;
  if (!operationName || !operationName.startsWith(OPERATION_PREFIX)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Whitelisted operations (ExchangeToken) and auth operations (Register, SignIn, etc.)
  // require x-api-key instead of JWT - accept from header or cookie
  if (isWhitelistedRequest(req.body) || isAuthOperation(req.body)) {
    const apiKey = (req.headers['x-api-key'] as string) || req.cookies?.['x-api-key'];

    if (!apiKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!validateApiKey(apiKey)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
    return;
  }

  // Check for access_token cookie
  const accessToken = req.cookies?.access_token;

  if (!accessToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const decoded = verifyAccessToken(accessToken);
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Rate limit check
  const { allowed, remaining, limit } = checkRateLimit(decoded.UserGUID);
  setRateLimitHeaders(res, remaining, limit);

  if (!allowed) {
    res.status(429).json({ error: 'Too Many Requests' });
    return;
  }

  // Attach decoded payload to request for Context to read
  req.tokenPayload = decoded;
  next();
}
