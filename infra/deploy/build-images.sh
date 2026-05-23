#!/usr/bin/env bash
# Build das imagens antes do docker stack deploy (Swarm não faz build automático).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${1:-$ROOT/infra/deploy/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo .env não encontrado: $ENV_FILE"
  echo "Copie infra/deploy/.env.example para infra/deploy/.env e preencha."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

API_URL="https://${API_HOST}"
KC_URL="https://${KEYCLOAK_HOST}"

echo "Build API..."
docker build -f "$ROOT/apps/api/Dockerfile" -t "${LAVA_API_IMAGE:-lava-rapido-api:latest}" "$ROOT"

echo "Build Web (NEXT_PUBLIC_API_URL=$API_URL)..."
docker build -f "$ROOT/Dockerfile.web" \
  --build-arg "NEXT_PUBLIC_API_URL=$API_URL" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_URL=$KC_URL" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_REALM=${KEYCLOAK_REALM:-lava-rapido}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-lava-rapido-web}" \
  -t "${LAVA_WEB_IMAGE:-lava-rapido-web:latest}" \
  "$ROOT"

echo "Imagens prontas:"
echo "  ${LAVA_API_IMAGE:-lava-rapido-api:latest}"
echo "  ${LAVA_WEB_IMAGE:-lava-rapido-web:latest}"
