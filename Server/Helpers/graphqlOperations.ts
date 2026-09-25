import { Kind, parse, type OperationDefinitionNode } from 'graphql';

const WHITE_LISTED_OPERATIONS = process.env.WHITE_LIST_OPERATION?.split(',') || [];
const AUTH_OPERATIONS = ['Register', 'Activate', 'SignIn', 'SocialSignIn', 'RefreshToken'];
const INTROSPECTION_FIELDS = ['__schema', '__type'];

/** Allowed alongside any root field; it names the root type and reads nothing. */
const TYPENAME = '__typename';

/**
 * The root fields of the operation this request will run, or null when it
 * can't be told: no query, a syntax error, or no operation matching the
 * name. A fragment spread at the root counts as a field no list contains.
 *
 * Checks read the parsed operation, not the operation's name or the query
 * text. The name is the caller's choice, and the text can mention any field
 * in a comment or in an operation that won't run.
 */
function rootFields(body: unknown): string[] | null {
  const { operationName, query } = (body ?? {}) as { operationName?: string; query?: string };
  if (typeof query !== 'string') return null;

  let operations: OperationDefinitionNode[];
  try {
    operations = parse(query).definitions.filter(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION,
    );
  } catch {
    return null;
  }

  const operation = operationName
    ? operations.find(({ name }) => name?.value === operationName)
    : operations.length === 1 ? operations[0] : undefined;
  if (!operation) return null;

  return operation.selectionSet.selections.map((selection) =>
    selection.kind === Kind.FIELD ? selection.name.value : '...',
  );
}

/** Every root field is one of `allowed` or `__typename`, and at least one is `allowed`. */
function onlyFields(body: unknown, allowed: string[]): boolean {
  const fields = rootFields(body);
  if (!fields) return false;
  return fields.some((field) => allowed.includes(field))
    && fields.every((field) => field === TYPENAME || allowed.includes(field));
}

export function isAuthOperation(body: unknown): boolean {
  return onlyFields(body, AUTH_OPERATIONS);
}

export function isWhitelistedRequest(body: unknown): boolean {
  return onlyFields(body, WHITE_LISTED_OPERATIONS);
}

/** Schema reads only, or `{ __typename }` on its own. */
export function isIntrospectionRequest(body: unknown): boolean {
  const fields = rootFields(body);
  if (!fields?.length) return false;
  return fields.every((field) => field === TYPENAME || INTROSPECTION_FIELDS.includes(field));
}

export const OPERATION_PREFIX = 'kicl_';
