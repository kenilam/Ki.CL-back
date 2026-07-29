// Entry barrel uses relative paths so emitted .d.ts stays portable for MF consumers.
// Internal modules may still import via the `api/*` path alias (see tsconfig / vite).

export { KiclProvider, getKiclClient } from './provider';
export { getSessionType, isAuthenticated, hasSession, getApiKey } from './utils';
export * from './generated/hooks';
export { gql, useQuery, useMutation, useLazyQuery, useSubscription, useApolloClient } from '@apollo/client';
