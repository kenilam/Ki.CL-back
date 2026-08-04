# Backend image for Cloud Run.
#
# Codegen and the client bundle are built here rather than at boot. The
# `production` script does all three in sequence, which would repeat a minute of
# work on every cold start and — worse — make the container's first request wait
# on a build that could fail after the service reports healthy.

FROM node:24-slim

WORKDIR /src

# Yarn 4 comes from the `packageManager` field rather than a bundled release.
RUN corepack enable

# Manifests first, so a dependency install is only redone when they change.
COPY package.json yarn.lock .yarnrc.yml ./
# `.yarn/` is not copied here: `.gitignore` keeps everything in it out of the
# repository, so the directory is absent from a clean checkout and the COPY
# fails. It exists locally — install state and an empty patches folder — which
# is why a deploy from local sources built and the first build from git did
# not. Should patches ever be committed, `COPY . .` below picks them up.
COPY Server/package.json ./Server/
COPY Codegen/package.json ./Codegen/
COPY Client/package.json ./Client/

# Dev dependencies are needed at runtime: the server is run through `tsx`, which
# is a devDependency, and there is no compile step.
RUN yarn install --immutable

COPY . .

# `Server/Types/graphql.ts` and `Client/src/generated` are generated, not
# committed, so the server cannot start without this having run.
RUN yarn codegen \
  && yarn workspace @ki-cl/client run build

ENV NODE_ENV=production

# Cloud Run supplies PORT and ignores EXPOSE; this documents the default the
# server falls back to when PORT is absent.
EXPOSE 8080

CMD ["yarn", "tsx", "Server/index.ts"]
