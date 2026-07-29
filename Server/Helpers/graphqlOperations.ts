const WHITE_LISTED_OPERATIONS = process.env.WHITE_LIST_OPERATION?.split(',') || [];
const AUTH_OPERATIONS = ['Register', 'Activate', 'SignIn', 'SocialSignIn', 'RefreshToken'];

export function isAuthOperation(body: unknown): boolean {
  const b = body as { operationName?: string; query?: string } | undefined;
  const operationName = b?.operationName;
  const query = b?.query;

  return AUTH_OPERATIONS.some(
    (op) => operationName?.endsWith(op) || (query && query.includes(op)),
  );
}

export function isWhitelistedRequest(body: unknown): boolean {
  const b = body as { operationName?: string; query?: string } | undefined;
  const operationName = b?.operationName;
  const query = b?.query;

  return WHITE_LISTED_OPERATIONS.some(
    (op) => operationName?.endsWith(op) || (query && query.includes(op)),
  );
}

export function isIntrospectionRequest(body: unknown): boolean {
  const b = body as { operationName?: string; query?: string } | undefined;
  const operationName = b?.operationName;
  const query = b?.query;

  if (operationName === 'IntrospectionQuery') return true;
  if (query && (query.includes('__schema') || query.includes('__type'))) return true;
  return false;
}

export const OPERATION_PREFIX = 'kicl_';
