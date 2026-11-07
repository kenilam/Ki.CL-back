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
Each GraphQL feature lives under `Server/Modules/<Name>/` with a co-located `schema.graphql` + `resolver.ts` (and often `validation.ts`). `Server/Schema.ts` globs every `Modules/**/*.graphql` and `Modules/**/resolver.{ts,js}`, merges them with `@graphql-tools/merge`, and builds the schema with `makeExecutableSchema`. To add a GraphQL feature, add a new `Modules/<Name>/` folder - no central registration is needed beyond that.

Current modules: `Register`, `Activate`, `SignIn`, `SignOut`, `SocialSignIn` (Google/Apple), `RefreshToken`, `ExchangeToken`, `Me`, `UpdateMe`, `DeleteMe`, `PasswordChange`, `Contact`, `Asset`, `TreeOfLife`, `TaxonVisual`, `TaxonSearch`, `Portfolio`, `ImageAgent`, `KineticLight`, `Translations`.

### Path aliases (hard rule, enforced by `.cursor/rules/ts-path-aliases.mdc`)
Never use `../`-style relative imports inside `Server/`. Use the `server/*` alias (maps to `Server/*`) for anything that would otherwise climb directories; `^/*` maps to the repo root for rare paths outside `Server`. Same-folder `./` imports are fine. Keep the `.js` extension on local ESM imports (this is ESM/NodeNext-style resolution even though `moduleResolution` is `bundler`). Codegen-emitted files are the one exception - they follow the scalar maps in `Codegen/codegen.ts` and should keep using `^/Codegen/...` / `server/...` aliases so regeneration stays consistent.

### Auth model
Two parallel credential mechanisms guard GraphQL requests, enforced in `Server/Middleware/authenticate.ts`:
- **x-api-key** (server-issued, short-lived) - required for introspection (non-BFF path only), and for "auth operations" (`register`, `activate`, `signIn`, `socialSignIn`, `refreshToken`) and any operation whose root fields are all listed in `WHITE_LIST_OPERATION` (`exchangeToken`, `translations`). The list holds root field names, not operation names. Issued/refreshed via cookie by the middleware itself.
- **access_token JWT cookie** - required for every other operation; decoded payload is attached to `req.tokenPayload` and consumed by `Server/Context/index.ts` to resolve the authenticated `User`. `createContext` also reads the cookie itself, so `context.tokenPayload` is set for any resolver that needs to know who is calling.

All mutations/queries must send an `operationName` prefixed with `kicl_` (`OPERATION_PREFIX` in `Server/Helpers/graphqlOperations.ts`) or they're rejected with 401 - this is a lightweight anti-abuse gate, not real auth.

There are two mounted paths sharing one Express app and one Apollo Server instance:
- `/api` - the public BFF. `Server/Middleware/apiProxy.ts` strips any client-supplied `x-api-key` and injects a server-generated one for whitelisted/auth operations, so the browser never sees the real key.
- `/graphql` and `/` - direct access, used for the Apollo Playground/introspection in development.

WebSocket subscriptions are handled manually (not via the `ws`+`path` option, which breaks with two paths on one server) - `Server/index.ts` listens on `httpServer`'s `upgrade` event and routes to one of two `WebSocketServer({ noServer: true })` instances (`/graphql` vs `/api`) itself.

### Data layer
A module's folder holds only what that module uses. Code two modules or a script share goes in a shared place, and modules never import from each other: `Server/DataSources/AI` (the text, image and vision providers and their failover), `Server/DataSources/OpenTreeOfLife` (the OTOL API), and next to the collection it works on (`MongoDB/TreeOfLife/persist.ts`, `MongoDB/ImageAgentThreads/forget.ts`, `CreatedAsset` in `MongoDB/Assets/Model.ts`). `Server/index.ts` mounting ExchangeToken's route is the one exception, as the place the app is put together.

MongoDB via Mongoose (`Server/DataSources/MongoDB/`), one folder per collection (`Users`, `UserTokens`, `Registrations`, `Secrets`, `TreeOfLife`, `Assets`, `Translations` and others), each with a `Model.ts`. `Translations` also has `cache.ts`, the in-memory copy of every string. Per-request DataLoaders (`TreeOfLife`, `Asset`) are created fresh per GraphQL context in `Server/Context/index.ts::createLoaders` to avoid cross-request cache leaks.

Collections are snake_case plurals (`user_tokens`, `kinetic_light_readings`), named in each `Model.ts`. Every field is camelCase, in Mongo and in GraphQL, root fields and arguments included. The exception is `accept-language`, which keeps the header's spelling. `make mongo.naming` moved older databases to this naming.

Static assets (TaxonVisual images) live in Google Cloud Storage; `Server/DataSources/Google/Storage/` streams them through the server (`GOOGLE_STORAGE_PROXY`, default `/assets`) rather than exposing the bucket directly, since the bucket is private and anonymous access 403s.

### TaxonVisual pipeline
`Server/Modules/TaxonVisual/pipeline.ts` is the most involved module: a fixed (non-agentic) pipeline - resolve OTOL lineage → resolve a representative living specimen → generate an image prompt → generate image → vision-score the result → tighten prompt and retry once if it fails → persist best candidate to GCS. Text and image generation each go through a provider failover chain (`Server/DataSources/AI/failover.ts`): providers are tried in order, each gets its own bounded retries, and a provider that reports a non-retryable quota/budget error (`ProviderLimitError`) is put in a 30-minute cooldown (in-process, `exhaustedUntilMs` map) so later requests skip straight to the next provider. A per-minute limit isn't a budget error, even though Gemini words it like one: the provider is retried once, then skipped only for the wait it reports. Every provider call has a timeout (text 30s, vision 45s, image 90s, Kinetic Light chords 2 minutes, a Kinetic Light arrangement 1 minute, translation 5 minutes); a timeout moves to the next provider without retrying. Provider order (see `.env.template`) is quality-first, with paid providers last: text `OpenAI → Groq → Gemini (cascade)`; images `OpenAI → Cloudflare Workers AI → Pollinations → Gemini`.

### ImageAgent
`Server/Modules/ImageAgent/` is a conversation with a prompt-to-image agent (ported from the Python creative-brief agent, minus the copywriting tools). `imageAgentSend` records the person's message and returns at once; everything the agent does afterwards - a refusal, one clarifying question, progress while drawing, the picture - arrives as messages on `imageAgentThreadUpdated`, which pushes the whole thread on every change. Threads live in `image_agent_threads`, one drawing per record in `image_agent_jobs`, both owned by the token's `userGUID` (anonymous sessions included).

Each turn tells its owner how it's going through a notification (see Notifications).

The agent's turn is `respond.ts`: free local rules (`govern/rules.ts`) → OpenAI's free moderation endpoint → a small text-chain classifier that reads the earlier turns and decides whether the message is about a picture at all → a clarifier (`agent/clarify.ts`) that asks about one missing thing at a time (subject, style, setting, then mood or light), with tappable `choices` and a "Just draw it" skip on every question, up to `IMAGE_AGENT_MAX_QUESTIONS` (3) per picture, then draws. Drawing is the fixed loop in `agent/run.ts`, like TaxonVisual: refine the prompt → generate through the shared image failover chain → vision-score → retry once with the reviewer's notes → persist the best to GCS under `agent/`. It uses the same providers, from `Server/DataSources/AI`.

Quotas (`govern/quota.ts`) are counted from Mongo so a restart does not reset them: drawings per caller and overall per day, messages per caller and overall per day, different people per rolling hour (`IMAGE_AGENT_HOURLY_USERS`, 10; someone already counted carries on), a pause between messages, and one thread busy at a time. Refusals throw `TOO_MANY_REQUESTS` and are not recorded.

`imageAgentRetry` goes back to one of the person's messages (`rewind.ts`): later messages get `removedAt` and drop out of the conversation, the message is added again as a new one, and the brief, style and question count return to what they were then. Hidden messages stay in the document because the quotas count them; `visible()` in `types.ts` is what every reader of the conversation goes through.

The agent's turn runs in the process that took the message, so a restart ends it half way. `recover.ts` closes a turn that has been quiet too long (THINKING 2 minutes, DRAWING 8) for the caller's session with a FAILURE message and sets the thread back to IDLE. It runs when a thread is read or a message is sent, not at start-up, because another instance may still be working on the turn.

A caller is the session token's owner (`userGUID`), and nothing else: the service does not read or store visitor addresses. Clearing cookies or changing device starts a new session with its own allowance; that is accepted, and the Turnstile check on `exchangeToken` is what stops it being scripted. `imageAgentSend` and `imageAgentRetry` also require the token's `human` flag, set when the session passed Turnstile; without it they throw `CAPTCHA_REQUIRED`, and `exchangeToken` called with a valid session and a Turnstile token marks that session human. So a session issued while Cloudflare was down can read but not draw until the check passes. Every request needs a session, including reads: the Ki.CL root route starts one for every visitor, and `authenticate` answers 401 without one.

### Notifications
Work that carries on after its page is left tells its owner through one `notifications` collection (`Server/DataSources/MongoDB/Notifications/`), one record per owner and source record (`ownerGUID`, `collection`, `documentId`). A source calls `notify()` at each step, which writes the record again, clears `dismissedAt` and publishes `notificationUpdated`. `title` and `message` are `{ key, values }`, translated by the host: a key in its `common` namespace, or `api:` and a key from here. A record expires 30 days after it was last written. The API keeps no status on a notification; the host tells from the message key whether the work is still running.

- Kinetic Light (`KineticLight/notify.ts`) writes at each step of a read, and when `recover.ts` fails a stalled one.
- Image Agent (`ImageAgent/notify.ts`) writes whenever a turn publishes. The agent's own words are a value, since they're already in the visitor's language.
- A Tree of Life plate writes `plate` `drawing` for each visitor who starts or joins it. Those records are the list of who is waiting, and `settlePlate` tells them all when the plate settles.
- A password change writes `waiting` when it's requested and `done` or `failed` when it completes. Nothing runs when a request expires, so `settleFor` writes `expired` when the owner's notifications are next read. It also settles a plate that finished before someone's waiting record was written.

`notificationsDismiss(ids)` takes notifications out of the caller's list. `make notifications.migrate` moved the readings and image agent turns nobody had dismissed into the collection, and removed their `dismissedAt`.

### KineticLight
`Server/Modules/KineticLight/` keeps the songs behind the host's Kinetic Light links, in `kinetic_light_readings`. A TTL index removes each one at its `expiresAt`: 30 days after it was made, or 99 years for an example. Examples have no owner, so they count against no one's quota, and `kineticLightExamples` lists them for every visitor; `make kinetic-light.examples IDS="<id> <id>"` turns songs into examples, and `make kinetic-light.migrate` brought older songs to this shape. A song keeps only its title, not the file's name: a sheet starts with the name without its extension, which the vision model replaces when it finds a title, and a saved file sends the title the browser read. A song is a sheet the API read (`source` SHEET) or a MIDI or MusicXML file the browser read and sent with `kineticLightSave` (FILE, stored as base64 MIDI or MusicXML text, at most `KINETIC_LIGHT_DAILY_SAVES_PER_USER` a day). Anyone with a link can open it through `kineticLightReading(id)`.

`kineticLightRead` takes the file as base64 (up to 8 MB, which is why the GraphQL routes accept 12 MB bodies), stores a record in `kinetic_light_readings` with status READING, and answers at once. The read itself runs afterwards in the process that took the request (`run.ts`), like the image agent's turn.

- The notes come from the sheet reader in `Omr/`, a separate Python service around homr (AGPL-3.0, so it stays its own program), at `KINETIC_LIGHT_OMR_URL`. A PDF made by notation software (Sibelius, Finale, Dorico, MuseScore) is read from its drawing (`drawing.py`, music-font glyphs and shapes); other files go to homr, which reads lead sheets and piano music. `omr.ts` calls it, with an ID token when the address is `https://`. It also says how many bars each line of music has and how many notes it found.
- The chords, title and tempo come from the vision chain, with `gemini-3.5-flash` first (`KINETIC_LIGHT_VISION_MODELS`). The sheet reader runs first so the model can be told each line's bar count, and `read.ts` numbers the bars from the start of each line, so a bar the model leaves out only moves chords on its own line. The Gemini call streams (`onText` on the vision options), and `read.ts` reads the title and each finished line out of the partial reply.
- `kineticLightReadingUpdated` pushes the record at each step: stage NOTES, then CHORDS with the bar and note counts, then the title and chords as the model writes them, then READY with the MusicXML, or FAILED with a translated `failure`. `kineticLightReadings` lists the caller's sheets still being read, so a page load picks up whatever the subscription missed. Each step also writes the owner's notification (see Notifications). The pub/sub is in-process, like the image agent's.
- Either reader can fail on its own: the reading is then READY without `musicxml`, or without chords, title and tempo. Both failing is FAILED `unavailable`, and nothing found is FAILED `no_music`.
- `kineticLightArrange` asks the text chain to arrange a song, once (`arrange.ts`). The browser sends an outline: the title, tempo, beats per bar, and for each bar where notes start on a grid of eighths, triplets or sixteenths, with `b` for a note below middle C. The API adds a sheet's chords. The model chooses the sound (the grand piano, the 16′ house piano, an upright piano, a Wurlitzer or an FM synth), the drums (none, the acoustic kit, the same kit recorded lo-fi, hand percussion, the LinnDrum or the TR-808 drum machine) and the scene's speed, colour and glow, and writes the drums in sections of bars, each with a one-bar pattern, an optional fill on its last bar and a crash. The reply is checked and clamped and kept on the record as `arrangement`, and a song that already has one comes back as it is. Only the owner can ask, with the session's `human` flag: the host asks the first time `mine` is true and `arrangement` is null, which is when the owner first opens the song.
- Sheet quotas (`quota.ts`) follow the image agent's and are counted from the SHEET records: one read at a time per caller, a pause between reads (`KINETIC_LIGHT_MIN_INTERVAL_SECONDS`), reads per caller and overall per rolling day, and different people per hour. One at a time is also a unique index on `ownerGUID` over READING records, so two instances can't both start one. `recover.ts` fails a READING record after 10 minutes, when the caller's readings are read or a new one starts, since a restart ends the read halfway. Callers also need the session's `human` flag.

### User-facing text
No sentence a person reads is written in the code. Error messages, validation messages, the image agent's fixed lines and the emails are in `Server/locales/en-US/api.json` and `Server/locales/en-US/email.json`, and are seeded into the `translations` collection like the site's own namespaces: `make translations.seed DIR=Server/locales`.

`translate(namespace, key, values?)` in `Server/Helpers/translate.ts` reads a string. It is synchronous: it answers from the copy of the collection kept in memory (`Server/DataSources/MongoDB/Translations/cache.ts`, loaded before the server listens, refreshed every 60 seconds, the same copy the `translations` query serves) and from the JSON file for a key the database doesn't have. So a new key works before it is seeded, and a seeded value replaces the file's without a deploy. It follows i18next for what the files use: `{{name}}` values, `context` (`key_<context>`), plural forms picked with `Intl.PluralRules` for the language (`key_one`, `key_few`, `key_other`, and `key_zero` for 0 when it exists) and `$t(other_key)` within the namespace.

### Languages
The request's `Accept-Language` header picks the language, and nothing else does: no argument, no custom header. `Server/Middleware/acceptLanguage.ts` turns it into a list, highest `q` first, `q=0` left out, `en-US` last, and runs the request inside an `AsyncLocalStorage` (`Server/Helpers/acceptLanguage.ts`). Only fully translated languages stay in that list (`availableAcceptLanguages()` in `cache.ts`), so a language missing any string is skipped for the next one the visitor accepts. `translate()` and the `translations` query answer in the first language of the list, and the query names it in `Content-Language`. The `acceptLanguagesUpdated` subscription streams each language's `complete` and `translating` state to the switcher. Work a request starts, such as the image agent's turn, keeps the request's languages. Outside a request the language is `en-US`.

- The languages are the `locales` collection (`Server/DataSources/MongoDB/Locales/Model.ts`), one row each: a `tag`, a canonical BCP 47 language tag such as `en-US`, `zh-Hant` or `es`, and an optional `prompt`. The cache reads it with the translations, so a change shows within a minute without a deploy. `en-US` is `SOURCE`, the language the files are written in. Regional variants are rows of their own (`en-GB`, `fr-CA`, `es-MX`, `pt-PT`, `de-CH`). `matchAcceptLanguage` in `Server/Helpers/acceptLanguage.ts` maps any tag onto one of them by its likely script and region, the exact region first (`zh-TW` is `zh-Hant`, `es-AR` is `es`). The middleware matches among the complete languages only, so `es-MX` gets `es` until `es-MX` is translated. The `AcceptLanguage` GraphQL scalar accepts any canonical tag. The host gets the list from `acceptLanguagesUpdated` and the names from `Intl.DisplayNames`.
- `make locales.list`, `make locales.add TAG=it-CH PROMPT="…"` and `make locales.remove TAG=it-CH` change the list. `add` refuses a tag that isn't canonical, and the next translate run fills the new language in. `remove` deletes the locale and its strings, and `make translations.prune` also removes strings of a locale that's gone. `make locales.seed` writes the languages the site had before the collection, and leaves other rows alone.
- Names follow the standard they come from: the field is `accept-language` in Mongo, and `acceptLanguage` only where a hyphen can't be written (TS, GraphQL).
- Only `en-US` is written in files. `make translations.translate` translates every `en-US` string that is new or changed into the other languages with a model (Gemini first, then OpenAI, then Groq) and stores it with `source`, the English it came from. A row whose `source` still matches is left alone, so a value corrected by hand in the database stays until the English changes. A locale's `prompt` says how the language is written where its name doesn't: `zh-Hant`'s asks for the standard written Chinese used in Hong Kong, not colloquial Cantonese. To redo a language after changing it, unset `source` on its rows and run `translate` again; the old text stays until each string is replaced. `make translations.diff` reports what each language is missing. The Translate workflow (`.github/workflows/translate.yml`) runs `translate` against production every day just after Gemini's free quota resets, and on demand for `dev` or a few languages. It needs the `MONGODB_ATLAS_URI`, `GEMINI_API_KEY`, `OPENAI_API_KEY` and `GROQ_API_KEY` secrets, the `GROQ_TEXT_MODEL` variable, and an Atlas network rule that lets GitHub's runners in.
- The job sends each namespace in one request, because free tiers count requests. The limit that matters is the reply, 65,536 tokens on Gemini and Groq, and `design-docs` is about 36,000 in English. A reply that's cut off isn't valid JSON, so those strings go again in two halves. When every provider is waiting on a per-minute limit the job waits a minute, up to three times for each chunk. It stops once they're out for the day, and the next run carries on. Groq's 8,000 tokens a minute is too small for the largest namespaces, and `gpt-4o-mini` returns at most 16,384 tokens, so those depend on Gemini.
- Don't seed a large batch of new strings into production first: each new field makes every language incomplete until it's translated, so the site drops to English. Seed and translate on `dev`, copy the translations to `production`, then the English, then release the code that reads them. Only the languages production can already serve have to be ready. The others are hidden either way.
- Resolvers are loaded with `import()` in `Server/Schema.ts`. `loadFilesSync` used `require()`, which gave the resolvers their own copy of every module, with its own `AsyncLocalStorage` and translation cache.

To add a string:
- Add a key to the JSON file, keeping the keys sorted. Keys are lower case with underscores, flat, grouped by their first words (`error_*`, `validation_*`, `image_agent_*`; in `email.json`, the email's name). Values from elsewhere go in as `{{name}}`, never by joining strings. A key ends in `_one`, `_other` or `_zero` only when it is a plural form.
- Read it where the message is produced, on each call, not into a module-level constant: `throw NotFound(translate('api', 'error_user_not_found'))`. The error factories in `Server/Errors` take the finished message, and their defaults are translated already (`Unauthenticated()`). The `extensions.code` values are what clients depend on and do not change.
- In a valibot schema use `message('validation_email')` from `Server/Helpers/Validation/message.ts`. It hands valibot a function, so the schema stays at module level and the text is read when a check fails.
- In an email, the templates call `t('key')` and the `.ts` beside each one builds the subject and the plain-text body from the same keys. `layout.pug` takes `language`.
- Run `make translations.seed DIR=Server/locales` and then `make translations.translate` after a release that adds or changes strings, and `make translations.prune DIR=Server/locales` a release after one that removes them.

Not copy, and left in the code: prompts sent to models, log lines, script output, errors thrown for developers, GraphQL descriptions, and machine-readable bodies such as `{ "error": "Unauthorized" }`.

### Environment
Config is entirely env-driven (`dotenv`, see `.env.template` for the full list - Mongo Atlas URI, JWT signing keys, CORS origins, OAuth client secrets, GCS service account, per-provider API keys for TaxonVisual). `CORS_ORIGINS` is bypassed entirely when `NODE_ENV=development` (all origins allowed). `GRAPHQL_INTROSPECTION` and `APOLLO_PLAYGROUND` independently gate introspection and the Playground UI/GET-route availability - both should be `false` in production.

## Writing

Comments, commit messages and docs are read by people. Keep them plain: say what and why in normal sentences, no flourishes, no rhythm tricks, no narrating what the code already shows. If it would sound odd said out loud to a teammate, rewrite it.
