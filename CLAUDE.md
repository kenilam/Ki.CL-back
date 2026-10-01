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

Current modules: `Register`, `Activate`, `SignIn`, `SignOut`, `SocialSignIn` (Google/Apple), `RefreshToken`, `ExchangeToken`, `Me`, `Asset`, `TreeOfLife`, `TaxonVisual`, `ImageAgent`.

### Path aliases (hard rule, enforced by `.cursor/rules/ts-path-aliases.mdc`)
Never use `../`-style relative imports inside `Server/`. Use the `server/*` alias (maps to `Server/*`) for anything that would otherwise climb directories; `^/*` maps to the repo root for rare paths outside `Server`. Same-folder `./` imports are fine. Keep the `.js` extension on local ESM imports (this is ESM/NodeNext-style resolution even though `moduleResolution` is `bundler`). Codegen-emitted files are the one exception - they follow the scalar maps in `Codegen/codegen.ts` and should keep using `^/Codegen/...` / `server/...` aliases so regeneration stays consistent.

### Auth model
Two parallel credential mechanisms guard GraphQL requests, enforced in `Server/Middleware/authenticate.ts`:
- **x-api-key** (server-issued, short-lived) - required for introspection (non-BFF path only), and for "auth operations" (`Register`, `Activate`, `SignIn`, `SocialSignIn`, `RefreshToken`) and any operation named in `WHITE_LIST_OPERATION` (e.g. `ExchangeToken`). Issued/refreshed via cookie by the middleware itself.
- **access_token JWT cookie** - required for every other operation; decoded payload is attached to `req.tokenPayload` and consumed by `Server/Context/index.ts` to resolve the authenticated `User`. Note that `isIntrospectionRequest` matches any query containing `__type`, and every Apollo Client operation carries `__typename`, so on `/api` the middleware treats client operations as introspection and attaches nothing. `createContext` therefore also reads the cookie itself, so `context.tokenPayload` is set for any resolver that needs to know who is calling. Tightening the middleware match would switch on `RATE_LIMIT_PER_DAY` for every client operation, which is why it has been left alone.

All mutations/queries must send an `operationName` prefixed with `kicl_` (`OPERATION_PREFIX` in `Server/Helpers/graphqlOperations.ts`) or they're rejected with 401 - this is a lightweight anti-abuse gate, not real auth.

There are two mounted paths sharing one Express app and one Apollo Server instance:
- `/api` - the public BFF. `Server/Middleware/apiProxy.ts` strips any client-supplied `x-api-key` and injects a server-generated one for whitelisted/auth operations, so the browser never sees the real key.
- `/graphql` and `/` - direct access, used for the Apollo Playground/introspection in development.

WebSocket subscriptions are handled manually (not via the `ws`+`path` option, which breaks with two paths on one server) - `Server/index.ts` listens on `httpServer`'s `upgrade` event and routes to one of two `WebSocketServer({ noServer: true })` instances (`/graphql` vs `/api`) itself.

### Data layer
MongoDB via Mongoose (`Server/DataSources/MongoDB/`), one folder per collection (`Users`, `UserTokens`, `Registrations`, `Secrets`, `TreeOfLife`, `Assets`), each with a `Model.ts`. Per-request DataLoaders (`TreeOfLife`, `Asset`) are created fresh per GraphQL context in `Server/Context/index.ts::createLoaders` to avoid cross-request cache leaks. `Server/DataSources/MongoDB/DataLoader.ts` also contributes its own mergeable schema fragment for loader-backed fields.

Static assets (TaxonVisual images) live in Google Cloud Storage; `Server/DataSources/Google/Storage/` streams them through the server (`GOOGLE_STORAGE_PROXY`, default `/assets`) rather than exposing the bucket directly, since the bucket is private and anonymous access 403s.

### TaxonVisual pipeline
`Server/Modules/TaxonVisual/pipeline.ts` is the most involved module: a fixed (non-agentic) pipeline - resolve OTOL lineage → resolve a representative living specimen → generate an image prompt → generate image → vision-score the result → tighten prompt and retry once if it fails → persist best candidate to GCS. Text and image generation each go through a provider failover chain (`providers/failover.ts`): providers are tried in order, each gets its own bounded retries, and a provider that reports a non-retryable quota/budget error (`ProviderLimitError`) is put in a 30-minute cooldown (in-process, `exhaustedUntilMs` map) so later requests skip straight to the next provider. Every provider call has a timeout (text 30s, vision 45s, image 90s); a timeout moves to the next provider without retrying. Provider order (see `.env.template`) puts our own services first when their URL is set, then the external ones quality-first with paid providers last: text `self-hosted → OpenAI → Groq → Gemini (cascade)`; vision `self-hosted → OpenAI → Gemini`; images `self-hosted → OpenAI → Cloudflare Workers AI → Pollinations → Gemini`. `SELF_HOSTED_ONLY=true` drops every external provider from every chain. A provider may carry its own `timeoutMs` when it is known to be slower than the per-kind default, which the self-hosted ones do because a cold GPU instance loads its weights first.

### Self-hosted models
Two folders outside the Yarn workspaces run our own models on Cloud Run GPU services, each self-contained so it can move to its own repository. `ImageServer/` is a small Python service that serves one open-weight text-to-image model (Z-Image Turbo by default, Qwen-Image or FLUX.2 by `MODEL_ID`) through `diffusers`; the backend reaches it through the `self-hosted` image provider when `IMAGE_SERVER_URL` is set. `LanguageServer/` is a deploy of vLLM's own image serving one vision-language model (Qwen3-VL 8B by default) with an OpenAI-compatible API; the `self-hosted` text and vision providers (`providers/text/self-hosted.ts`, `providers/vision/self-hosted.ts`) share one client for it when `LLM_SERVER_URL` is set. The shared helpers in `providers/self-hosted.ts` handle the bearer (a Cloud Run ID token from the metadata server, or a shared `*_TOKEN`), the long timeout and the `SELF_HOSTED_ONLY` filter. Weights for both live in a Cloud Storage bucket mounted at `/weights`, not in the images. With `SELF_HOSTED_ONLY=true` and no `OPENAI_API_KEY`, the OpenAI moderation endpoint is skipped and the classifier, running on our model, is the safety check (see `govern/index.ts`).

### ImageAgent
`Server/Modules/ImageAgent/` is a conversation with a prompt-to-image agent (ported from the Python creative-brief agent, minus the copywriting tools). `ImageAgentSend` records the person's message and returns at once; everything the agent does afterwards - a refusal, one clarifying question, progress while drawing, the picture - arrives as messages on `ImageAgentThreadUpdated`, which pushes the whole thread on every change. Threads live in `image_agent_threads`, one drawing per record in `image_agent_jobs`, both owned by the token's UserGUID (anonymous sessions included).

The agent's turn is `respond.ts`: free local rules (`govern/rules.ts`) → OpenAI's free moderation endpoint → a small text-chain classifier that reads the earlier turns and decides whether the message is about a picture at all → a clarifier (`agent/clarify.ts`) that asks about one missing thing at a time (subject, style, setting, then mood or light), with tappable `choices` and a "Just draw it" skip on every question, up to `IMAGE_AGENT_MAX_QUESTIONS` (3) per picture, then draws. Drawing is the fixed loop in `agent/run.ts`, like TaxonVisual: refine the prompt → generate through the shared image failover chain → vision-score → retry once with the reviewer's notes → persist the best to GCS under `agent/`. It reuses `TaxonVisual/providers/*` rather than owning a copy.

Quotas (`govern/quota.ts`) are counted from Mongo so a restart does not reset them: drawings per caller and overall per day, messages per caller and overall per day, different people per rolling hour (`IMAGE_AGENT_HOURLY_USERS`, 10; someone already counted carries on), a pause between messages, and one thread busy at a time. Refusals throw `TOO_MANY_REQUESTS` and are not recorded.

`ImageAgentRetry` goes back to one of the person's messages (`rewind.ts`): later messages get `removedAt` and drop out of the conversation, the message is added again as a new one, and the brief, style and question count return to what they were then. Hidden messages stay in the document because the quotas count them; `visible()` in `types.ts` is what every reader of the conversation goes through.

The agent's turn runs in the process that took the message, so a restart ends it half way. `recover.ts` closes a turn that has been quiet too long (THINKING 2 minutes, DRAWING 8) for the caller's session with a FAILURE message and sets the thread back to IDLE. It runs when a thread is read or a message is sent, not at start-up, because another instance may still be working on the turn.

A caller is the session token's owner (`UserGUID`), and nothing else: the service does not read or store visitor addresses. Clearing cookies or changing device starts a new session with its own allowance; that is accepted, and the Turnstile check on `ExchangeToken` is what stops it being scripted. `ImageAgentSend` and `ImageAgentRetry` also require the token's `human` flag, set when the session passed Turnstile; without it they throw `CAPTCHA_REQUIRED`, and `ExchangeToken` called with a valid session and a Turnstile token marks that session human. So a session issued while Cloudflare was down can read but not draw until the check passes. Every request needs a session, including reads: the Ki.CL root route starts one for every visitor, and `authenticate` answers 401 without one, so nothing runs uncounted.

### Environment
Config is entirely env-driven (`dotenv`, see `.env.template` for the full list - Mongo Atlas URI, JWT signing keys, CORS origins, rate limit, OAuth client secrets, GCS service account, per-provider API keys for TaxonVisual). `CORS_ORIGINS` is bypassed entirely when `NODE_ENV=development` (all origins allowed). `GRAPHQL_INTROSPECTION` and `APOLLO_PLAYGROUND` independently gate introspection and the Playground UI/GET-route availability - both should be `false` in production.

## Writing

Comments, commit messages and docs are read by people. Keep them plain: say what and why in normal sentences, no flourishes, no rhythm tricks, no narrating what the code already shows. If it would sound odd said out loud to a teammate, rewrite it.
