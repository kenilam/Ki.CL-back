// Entry barrel uses relative paths so emitted .d.ts stays portable for MF consumers.
// Internal modules may still import via the `api/*` path alias (see tsconfig / vite).

export { KiclProvider, getKiclClient } from './provider';
export { getSessionType, isAuthenticated, hasSession, getApiKey } from './utils';
/*
 * Typed documents, not generated hooks.
 *
 * Apollo Client 4 infers result and variable types from a `TypedDocumentNode`
 * passed to a standard hook, so `useQuery(SomeDocument)` is fully typed with no
 * generics and no per-operation wrapper. The hooks plugin that used to generate
 * those wrappers targets Apollo Client 3, is unmaintained against 4, and needed
 * three patches to emit code that compiled at all.
 */
export * from './generated/graphql';
export { gql } from '@apollo/client';
// Apollo Client 4 moved the React bindings out of the root export.
export {
  useQuery,
  useMutation,
  useLazyQuery,
  useSubscription,
  useApolloClient,
  // Apollo Client 4 replaces the `{ skip: true }` option object; passing the
  // token where options would go is how a conditional hook opts out now.
  skipToken,
} from '@apollo/client/react';
