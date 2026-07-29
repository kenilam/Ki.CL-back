import type { Request, Response, NextFunction } from 'express';

/**
 * Security headers for MitM prevention:
 * - HSTS: forces HTTPS for 1 year
 * - X-Content-Type-Options: prevents MIME sniffing
 * - X-Frame-Options: prevents clickjacking
 * - X-XSS-Protection: legacy XSS filter
 * - Referrer-Policy: limits referrer leakage
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}
