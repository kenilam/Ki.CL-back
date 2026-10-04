import 'dotenv/config';
import express from 'express';
import appRoot from 'app-root-path';
import { createServer } from 'node:http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

import { schema } from './Schema.js';
import { createContext, createWsContext, type Context } from './Context/index.js';
import { corsMiddleware } from './Middleware/cors.js';
import { securityHeaders } from './Middleware/securityHeaders.js';
import { authenticate } from './Middleware/authenticate.js';
import { apiProxy } from './Middleware/apiProxy.js';
import { sessionRoute } from './Modules/ExchangeToken/route.js';
import { connectDatabase, mongoose } from './DataSources/MongoDB/index.js';
import { createGoogleStorageAssetHandler } from './DataSources/Google/Storage/assetHandler.js';
import { loadCerts } from './Helpers/certs.js';
import type { IncomingMessage } from 'node:http';

const PORT = Number(process.env.PORT) || 3100;
const GOOGLE_STORAGE_PROXY = process.env.GOOGLE_STORAGE_PROXY || '/assets';

const app = express();
const httpServer = createServer(app);

const wsContext = async (ctx: {
  connectionParams?: Record<string, unknown> | undefined;
  extra?: { request?: IncomingMessage };
}) => {
  const request = ctx.extra?.request;
  return createWsContext({
    connectionParams: ctx.connectionParams,
    request,
  });
};

/**
 * Two paths share one HTTP server. Attaching two WebSocketServers with
 * `server` + `path` is broken in `ws`: a path miss aborts with 400 before
 * the other listener can handle the upgrade. Route upgrades manually.
 */
const graphqlWss = new WebSocketServer({ noServer: true });
const apiWss = new WebSocketServer({ noServer: true });

const graphqlWsCleanup = useServer({ schema, context: wsContext }, graphqlWss);
const apiWsCleanup = useServer({ schema, context: wsContext }, apiWss);

httpServer.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');

  if (pathname === '/graphql') {
    graphqlWss.handleUpgrade(request, socket, head, (ws) => {
      graphqlWss.emit('connection', ws, request);
    });
    return;
  }

  if (pathname === '/api') {
    apiWss.handleUpgrade(request, socket, head, (ws) => {
      apiWss.emit('connection', ws, request);
    });
    return;
  }

  socket.destroy();
});

const server = new ApolloServer<Partial<Context>>({
  schema,
  introspection: process.env.GRAPHQL_INTROSPECTION === 'true',
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await Promise.all([graphqlWsCleanup.dispose(), apiWsCleanup.dispose()]);
          },
        };
      },
    },
    process.env.APOLLO_PLAYGROUND === 'true'
      ? ApolloServerPluginLandingPageLocalDefault({ footer: true })
      : ApolloServerPluginLandingPageDisabled(),
  ],
});

async function start() {
  await connectDatabase();
  await loadCerts();
  await server.start();

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Serve federated Client at /client (CORS required for cross-origin ES module loads)
  app.use('/client', corsMiddleware, express.static(appRoot.resolve('Client/dist')));
  // Module Federation host looks for @mf-types.zip by default
  app.get('/client/@mf-types.zip', corsMiddleware, (req, res) => {
    res.sendFile(appRoot.resolve('Client/dist/types.zip'));
  });

  // GCS assets - stream via service account (bucket is private; anonymous proxy 403s)
  if (GOOGLE_STORAGE_PROXY) {
    app.use(
      GOOGLE_STORAGE_PROXY,
      corsMiddleware,
      createGoogleStorageAssetHandler(),
    );
  }

  // Block GET on GraphQL paths when playground is disabled (production)
  if (process.env.APOLLO_PLAYGROUND !== 'true') {
    app.get('/graphql', (req, res) => { res.status(404).end(); });
    app.get('/api', (req, res) => { res.status(404).end(); });
    app.get('/', (req, res) => { res.status(404).end(); });
  }

  const graphqlMiddleware = [
    securityHeaders,
    cookieParser(),
    corsMiddleware,
    bodyParser.json(),
    authenticate,
    expressMiddleware(server, {
      context: createContext,
    }),
  ] as const;

  const apiMiddleware = [
    securityHeaders,
    cookieParser(),
    corsMiddleware,
    bodyParser.json(),
    apiProxy,
    authenticate,
    expressMiddleware(server, {
      context: createContext,
    }),
  ] as const;

  /*
   * ExchangeToken without GraphQL, ahead of the BFF so Apollo doesn't take the
   * path. It needs no key: the BFF lets anyone run ExchangeToken too.
   */
  app.post('/api/session', securityHeaders, corsMiddleware, sessionRoute);

  // Public BFF - injects x-api-key server-side; never exposes it to the browser
  app.use('/api', ...apiMiddleware);
  // Playground / introspection (may still issue x-api-key cookie for local debugging)
  app.use('/graphql', ...graphqlMiddleware);
  app.use('/', ...graphqlMiddleware);

  // Catch-all: 404 for any unmatched route
  app.use((req, res) => {
    res.status(404).end();
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/api`);
    console.log(`🎮 Playground: ${process.env.APOLLO_PLAYGROUND === 'true' ? `http://localhost:${PORT}/graphql` : 'disabled'}`);
    console.log(`📊 Introspection: ${process.env.GRAPHQL_INTROSPECTION === 'true' ? 'enabled' : 'disabled'}`);
  });

  // The open sockets and the database connection would keep the process alive past a stop signal, so
  // tsx watch had to force-kill it on every restart. Close them and go.
  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`${signal}: shutting down`);
    for (const wss of [graphqlWss, apiWss]) {
      wss.clients.forEach((client) => client.terminate());
      wss.close();
    }
    httpServer.close();
    httpServer.closeAllConnections();
    mongoose.disconnect().finally(() => process.exit(0));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
