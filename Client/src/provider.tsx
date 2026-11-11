import React, { useEffect, useState } from 'react';
// Apollo Client 4 serves the React bindings from their own entry point.
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';

import { Kicl_ExchangeTokenDocument } from 'api/generated/graphql';
import { getKiclClient } from 'api/client';
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
