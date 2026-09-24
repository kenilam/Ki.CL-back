import { createHmac } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { isIPv6 } from 'node:net';
import type { Express } from 'express';

/**
 * Apply `TRUST_PROXY` to Express, so `req.ip` is the caller rather than the
 * proxy in front of us. It takes a hop count ("2") or any value Express
 * accepts ("loopback"). Left unset, Express trusts no proxy.
 */
export function configureTrustProxy(app: Express): void {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value) return;
  app.set('trust proxy', /^\d+$/.test(value) ? Number(value) : value);
}

/**
 * In production an unset `TRUST_PROXY` means `req.ip` is the proxy's address,
 * shared by every visitor. Limiting on it would lock everyone out at once, so
 * per-address limits stay off until the proxy chain is configured.
 */
function addressIsTrusted(): boolean {
  return Boolean(process.env.TRUST_PROXY?.trim()) || process.env.NODE_ENV !== 'production';
}

/**
 * Set by the Ki.CL web server to the visitor's address. It reaches us through
 * the VPC, so `req.ip` is the web server's egress, shared by every visitor,
 * however many hops `TRUST_PROXY` counts. Only the web server can call this
 * service, and it overwrites whatever the browser sent.
 */
const CLIENT_ADDRESS_HEADER = 'x-kicl-client-address';

/**
 * The caller's address: the web server's header when present, otherwise the
 * address Express saw, when it can be trusted.
 */
export function clientAddress(
  headers: IncomingHttpHeaders,
  ip: string | undefined,
): string | undefined {
  const forwarded = headers[CLIENT_ADDRESS_HEADER];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.trim();
  return addressIsTrusted() ? ip : undefined;
}

/**
 * IPv6 hands one subscriber a whole /64, so a single address inside it is
 * free to change. Count the /64 instead; IPv4-mapped addresses count as IPv4.
 */
function normalise(ip: string): string {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  if (!isIPv6(ip)) return ip;

  const [head, tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = ip.includes('::')
    ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right]
    : left;
  return `${groups.slice(0, 4).join(':')}::/64`;
}

/**
 * A stable key for the caller's address, from `clientAddress`, or null when
 * there is none.
 * Stored as an HMAC so the collections never hold raw addresses.
 */
export function addressKey(ip: string | undefined): string | null {
  const secret = process.env.ADDRESS_HASH_SECRET || process.env.JWT_ACCESS_TOKEN_PRIVATE_KEY;
  if (!ip || !secret) return null;
  return createHmac('sha256', secret).update(normalise(ip)).digest('base64url');
}
