#!/usr/bin/env bash
# Redeploy sem rebuild (após alterar .env)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/infra/deploy/.env"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

STACK="${STACK_NAME:-lava-rapido}"

"$ROOT/infra/deploy/validate-env.sh" "$ENV_FILE"

docker stack deploy \
  -c "$ROOT/infra/deploy/docker-compose.swarm.yml" \
  --env-file "$ENV_FILE" \
  --with-registry-auth \
  "$STACK"

echo "Stack $STACK atualizado."
