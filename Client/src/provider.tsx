import React, { useEffect, useState } from 'react';
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client';
// Apollo Client 4 serves the React bindings from their own entry point.
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';

import { Kicl_ExchangeTokenDocument } from 'api/generated/graphql';
import { createSocketClient } from 'api/socket';
import { hasSession } from 'api/utils';

interface KiclProviderProps {
  uri?: string;
  /** WebSocket URL. Defaults to uri with http→ws. */
  wsUri?: string;
  /**
   * Start an anonymous session on mount. The host turns this off when it
   * starts sessions itself, for example after a Turnstile check.
   */
  autoExchange?: boolean;
  children: React.ReactNode;
}

function toWsUri(httpUri: string): string {
  if (httpUri.startsWith('https://')) return `wss://${httpUri.slice('https://'.length)}`;
  if (httpUri.startsWith('http://')) return `ws://${httpUri.slice('http://'.length)}`;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const path = httpUri.startsWith('/') ? httpUri : `/${httpUri}`;
    return `${protocol}//${window.location.host}${path}`;
  }
  return httpUri.replace(/^http/, 'ws');
}

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
          httpLink,
        )
      : httpLink;

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

export function KiclProvider({
  uri = '/api',
  wsUri,
  autoExchange = true,
  children,
}: KiclProviderProps) {
  const client = getKiclClient(uri, wsUri);
  const [ready, setReady] = useState(() => !autoExchange || hasSession());

  useEffect(() => {
    if (ready) return;

    let cancelled = false;

    client
      .mutate({ mutation: Kicl_ExchangeTokenDocument })
      .catch(() => {
        // Session bootstrap failed; children still render so the app can recover
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, ready]);

  return (
    <BaseApolloProvider client={client}>
      {ready ? children : null}
    </BaseApolloProvider>
  );
}
