# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is a Yarn 4 (Berry) workspace repo with three workspaces: `Server`, `Codegen`, `Client`. Node >=24 required.

```bash
yarn install                # install all workspaces
yarn codegen                # regenerate Server/Types/graphql.ts and Client/src/generated/* from schema.graphql files
yarn development            # codegen + build Client + start Server (tsx watch, NODE_ENV=development)
yarn production              # codegen + build Client + start Server (NODE_ENV=production)
yarn build                   # codegen + tsc --noEmit (typecheck only, no test suite exists)
yarn lint                    # eslint Server/ --ext .ts
```

There is no test runner configured - verification is `yarn build` (typecheck) and `yarn lint`.

Codegen must be re-run (`yarn codegen`) after editing any `Server/Modules/**/*.graphql` schema file or `Client/src/operations.graphql` - it regenerates both server resolver types (`Server/Types/graphql.ts`) and the client's typed hooks (`Client/src/generated/`). Scalar JS↔GraphQL mappings live in `Codegen/codegen.ts` and `Codegen/scalars.ts`.

## Architecture

### Workspaces
- **Server** - Apollo Server 4 + Express 5 GraphQL API (TypeScript, ESM, `tsx` runtime, no build step for dev).
- **Codegen** - GraphQL Code Generator config; reads all `Server/Modules/**/*.graphql` schemas and emits typed resolvers server-side and typed operations/hooks client-side.
- **Client** - `@ki-cl/client`, a React 19 + Apollo Client package built with Vite and exposed via Module Federation (`@module-federation/vite`), served by the Server itself at `/client` (see below).

### Module-per-feature schema
Each GraphQL feature lives under `Server/Modules/<Name>/` with a co-located `schema.graphql` + `resolver.ts` (and often `validation.ts`). `Server/Schema.ts` globs every `Modules/**/*.graphql` and `Modules/**/resolver.{ts,js}`, merges them with `@graphql-tools/merge`, and merges the result with a separate DataLoader-driven schema (`DataSources/MongoDB/DataLoader.ts`) via `mergeSchemas`. To add a GraphQL feature, add a new `Modules/<Name>/` folder - no central registration is needed beyond that.

Current modules: `Register`, `Activate`, `SignIn`, `SignOut`, `SocialSignIn` (Google/Apple), `RefreshToken`, `ExchangeToken`, `Me`, `Asset`, `TreeOfLife`, `TaxonVisual`.

### Path aliases (hard rule, enforced by `.cursor/rules/ts-path-aliases.mdc`)
Never use `../`-style relative imports inside `Server/`. Use the `server/*` alias (maps to `Server/*`) for anything that would otherwise climb directories; `^/*` maps to the repo root for rare paths outside `Server`. Same-folder `./` imports are fine. Keep the `.js` extension on local ESM imports (this is ESM/NodeNext-style resolution even though `moduleResolution` is `bundler`). Codegen-emitted files are the one exception - they follow the scalar maps in `Codegen/codegen.ts` and should keep using `^/Codegen/...` / `server/...` aliases so regeneration stays consistent.

### Auth model
Two parallel credential mechanisms guard GraphQL requests, enforced in `Server/Middleware/authenticate.ts`:
- **x-api-key** (server-issued, short-lived) - required for introspection (non-BFF path only), and for "auth operations" (`Register`, `Activate`, `SignIn`, `SocialSignIn`, `RefreshToken`) and any operation named in `WHITE_LIST_OPERATION` (e.g. `ExchangeToken`). Issued/refreshed via cookie by the middleware itself.
- **access_token JWT cookie** - required for every other operation; decoded payload is attached to `req.tokenPayload` and consumed by `Server/Context/index.ts` to resolve the authenticated `User`.

All mutations/queries must send an `operationName` prefixed with `kicl_` (`OPERATION_PREFIX` in `Server/Helpers/graphqlOperations.ts`) or they're rejected with 401 - this is a lightweight anti-abuse gate, not real auth.

There are two mounted paths sharing one Express app and one Apollo Server instance:
- `/api` - the public BFF. `Server/Middleware/apiProxy.ts` strips any client-supplied `x-api-key` and injects a server-generated one for whitelisted/auth operations, so the browser never sees the real key.
- `/graphql` and `/` - direct access, used for the Apollo Playground/introspection in development.

WebSocket subscriptions are handled manually (not via the `ws`+`path` option, which breaks with two paths on one server) - `Server/index.ts` listens on `httpServer`'s `upgrade` event and routes to one of two `WebSocketServer({ noServer: true })` instances (`/graphql` vs `/api`) itself.

### Data layer
MongoDB via Mongoose (`Server/DataSources/MongoDB/`), one folder per collection (`Users`, `UserTokens`, `Registrations`, `Secrets`, `TreeOfLife`, `Assets`), each with a `Model.ts`. Per-request DataLoaders (`TreeOfLife`, `Asset`) are created fresh per GraphQL context in `Server/Context/index.ts::createLoaders` to avoid cross-request cache leaks. `Server/DataSources/MongoDB/DataLoader.ts` also contributes its own mergeable schema fragment for loader-backed fields.

Static assets (TaxonVisual images) live in Google Cloud Storage; `Server/DataSources/Google/Storage/` streams them through the server (`GOOGLE_STORAGE_PROXY`, default `/assets`) rather than exposing the bucket directly, since the bucket is private and anonymous access 403s.

### TaxonVisual pipeline
`Server/Modules/TaxonVisual/pipeline.ts` is the most involved module: a fixed (non-agentic) pipeline - resolve OTOL lineage → resolve a representative living specimen → generate an image prompt → generate image → vision-score the result → tighten prompt and retry once if it fails → persist best candidate to GCS. Text and image generation each go through a provider failover chain (`providers/failover.ts`): providers are tried in order, each gets its own bounded retries, and a provider that reports a non-retryable quota/budget error (`ProviderLimitError`) is put in a 30-minute cooldown (in-process, `exhaustedUntilMs` map) so later requests skip straight to the next provider. Provider order (see `.env.template`) is quality-first, with paid providers last: text `OpenAI → Groq → Gemini (cascade)`; images `OpenAI → Cloudflare Workers AI → Pollinations → Gemini`.

### Environment
Config is entirely env-driven (`dotenv`, see `.env.template` for the full list - Mongo Atlas URI, JWT signing keys, CORS origins, rate limit, OAuth client secrets, GCS service account, per-provider API keys for TaxonVisual). `CORS_ORIGINS` is bypassed entirely when `NODE_ENV=development` (all origins allowed). `GRAPHQL_INTROSPECTION` and `APOLLO_PLAYGROUND` independently gate introspection and the Playground UI/GET-route availability - both should be `false` in production.
