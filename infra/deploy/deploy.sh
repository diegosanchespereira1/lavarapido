#!/usr/bin/env bash
# Deploy completo na VPS — Swarm + Traefik + MinIO existente
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/infra/deploy/.env"
COMPOSE="$ROOT/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/infra/deploy/.env.example" "$ENV_FILE"
  echo ""
  echo "Criado: $ENV_FILE"
  echo "Edite senhas e credenciais MinIO, depois rode novamente:"
  echo "  ./infra/deploy/deploy.sh"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

STACK="${STACK_NAME:-lava-rapido}"

echo "==> Validando ambiente"
"$ROOT/infra/deploy/validate-env.sh" "$ENV_FILE"

echo "==> Verificando rede Docker"
"$ROOT/infra/deploy/prepare-volumes.sh"

echo "==> Build imagens (API + Web)"
if [[ "${SKIP_BUILD:-false}" == "true" ]]; then
  echo "SKIP_BUILD=true — usando imagens remotas (Docker Hub):"
  echo "  ${LAVA_API_IMAGE:-?}"
  echo "  ${LAVA_WEB_IMAGE:-?}"
else
  "$ROOT/infra/deploy/build-images.sh" "$ENV_FILE"
fi

echo "==> Deploy stack: $STACK"
docker stack deploy \
  -c "$COMPOSE" \
  --env-file "$ENV_FILE" \
  --with-registry-auth \
  "$STACK"

echo ""
echo "Deploy enviado. Acompanhe:"
echo "  docker stack services $STACK"
echo "  docker service logs -f ${STACK}_lava-api"
echo ""
echo "URLs:"
echo "  Web:      https://${WEB_HOST}"
echo "  API:      https://${API_HOST}/v1/health"
echo "  Keycloak: https://${KEYCLOAK_HOST}"
echo ""
if [[ "${DEV_AUTH:-false}" == "true" ]]; then
  echo "Login demo (DEV_AUTH=true): dev-admin / dev-operator"
else
  echo "Auth: Keycloak realm ${KEYCLOAK_REALM:-lava-rapido}"
fi
echo ""
echo "Após validar, defina RUN_DB_PUSH=false e RUN_DB_SEED=false no .env e rode:"
echo "  ./infra/deploy/update-stack.sh"
