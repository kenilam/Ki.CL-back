import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';

import { acceptLanguage } from 'api/acceptLanguage';
import { createSocketClient } from 'api/socket';
import { toWsUri } from 'api/wsUri';

const acceptLanguageLink = new SetContextLink(({ headers }) => {
  if (typeof document === 'undefined') {
    return {};
  }

  return { headers: { 'Accept-Language': acceptLanguage(document.documentElement.lang), ...headers } };
});

function createKiclClient(
  uri: string,
  wsUri: string,
): ApolloClient {
  const httpLink = createHttpLink({
    uri,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const wsLink =
    typeof window !== 'undefined'
      ? new GraphQLWsLink(createSocketClient(wsUri))
      : null;

  const link =
    wsLink != null
      ? split(
          ({ query }) => {
            const definition = getMainDefinition(query);
            return (
              definition.kind === 'OperationDefinition' &&
              definition.operation === 'subscription'
            );
          },
          wsLink,
          acceptLanguageLink.concat(httpLink),
        )
      : acceptLanguageLink.concat(httpLink);

  return new ApolloClient({
    link,
    cache: new InMemoryCache({
      typePolicies: {
        TreeOfLifeNode: {
          keyFields: ['nodeId'],
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
      mutate: {
        fetchPolicy: 'no-cache',
      },
    },
  });
}

let clientInstance: ApolloClient | null = null;

export function getKiclClient(
  uri: string = '/api',
  wsUri?: string,
): ApolloClient {
  if (!clientInstance) {
    clientInstance = createKiclClient(uri, wsUri ?? toWsUri(uri));
  }
  return clientInstance;
}
