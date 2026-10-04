import type { Request, Response } from 'express';
import { GraphQLError } from 'graphql';

import { exchangeToken } from './exchange.js';

/** The HTTP status for each error `exchangeToken` throws. */
const STATUS: Record<string, number> = {
  CAPTCHA_REQUIRED: 403,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * `POST /api/session`: the ExchangeToken mutation as a plain request, for a
 * client that doesn't use GraphQL, such as a federated module run on its own.
 * Same cookies, same Turnstile header (`x-turnstile-token`). Answers
 * `{ changed }`, or `{ error, code }` with 403 when the visitor has to pass
 * Turnstile and 503 when the check couldn't run.
 */
export async function sessionRoute(req: Request, res: Response): Promise<void> {
  try {
    const changed = await exchangeToken({ headers: req.headers, res });

    res.status(200).json({ changed });
  } catch (error) {
    const code = error instanceof GraphQLError ? error.extensions.code : undefined;
    const status = typeof code === 'string' ? STATUS[code] : undefined;

    if (status) {
      res.status(status).json({ error: (error as GraphQLError).message, code });
      return;
    }

    console.error('[ExchangeToken] session route failed', error);
    res.status(500).json({ error: 'Could not start a session.' });
  }
}
