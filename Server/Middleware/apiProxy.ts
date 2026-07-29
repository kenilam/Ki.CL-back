import type { Request, Response, NextFunction } from 'express';
import { generateApiKey } from 'server/Helpers/apiKey.js';
import {
  isAuthOperation,
  isWhitelistedRequest,
} from 'server/Helpers/graphqlOperations.js';

/**
 * BFF gate for `/api`: strip any client-supplied x-api-key and inject a
 * server-generated key for whitelist/auth operations so the browser never
 * holds the secret.
 */
export function apiProxy(req: Request, res: Response, next: NextFunction): void {
  // Never trust a browser-supplied key
  delete req.headers['x-api-key'];

  if (isWhitelistedRequest(req.body) || isAuthOperation(req.body)) {
    const apiKey = generateApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'Service Unavailable' });
      return;
    }
    req.headers['x-api-key'] = apiKey;
  }

  next();
}
