import type { Request, Response, NextFunction } from 'express';
import { acceptLanguages, withAcceptLanguages } from 'server/Helpers/acceptLanguage.js';

// Mounted after express.json(): the body parser calls next() from a stream callback, which runs outside this context.
export function acceptLanguage(req: Request, res: Response, next: NextFunction): void {
  withAcceptLanguages(acceptLanguages(req.headers['accept-language']), next);
}
