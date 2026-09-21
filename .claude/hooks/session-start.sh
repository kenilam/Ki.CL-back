#!/bin/bash
#
# SessionStart hook for Claude Code on the web.
#
# The cloud container ships Node 22 and no Yarn 4. This installs Node 24,
# enables Yarn through the npm registry, installs dependencies, runs codegen
# and builds the federated Client package, so `yarn build` and `yarn lint`
# work at once and the frontend has a remote to load even when the server
# cannot boot for want of a Mongo URI. Idempotent; a no-op off the web.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT"

log() { printf '[session-start] %s\n' "$*"; }

export NVM_DIR="${NVM_DIR:-/opt/nvm}"
# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh"

if ! nvm ls 24 >/dev/null 2>&1; then
  log 'installing Node 24'
  nvm install 24 || nvm install 24
fi

nvm use 24 >/dev/null
nvm alias default 24 >/dev/null
log "node $(node -v)"

export COREPACK_NPM_REGISTRY="${COREPACK_NPM_REGISTRY:-https://registry.npmjs.org}"
corepack enable
log "yarn $(yarn --version)"

log 'yarn install'
yarn install

log 'codegen'
yarn codegen

log 'building Client'
yarn workspace @ki-cl/client run build

# Only the non-secret values. MONGODB_ATLAS_URI and the JWT keys are never in
# the clone; without them the server will not boot - see the cloud-session
# skill in the frontend repo for the workaround.
if [ ! -f .env ]; then
  log 'writing .env'
  printf 'NODE_ENV=development\nPORT=3100\nGRAPHQL_INTROSPECTION=true\nAPOLLO_PLAYGROUND=true\n' > .env
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  {
    printf 'export NVM_DIR=%q\n' "$NVM_DIR"
    printf 'export PATH=%q:$PATH\n' "$(dirname "$(command -v node)")"
    printf 'export COREPACK_NPM_REGISTRY=%q\n' "$COREPACK_NPM_REGISTRY"
  } >> "$CLAUDE_ENV_FILE"
fi

log 'ready'
