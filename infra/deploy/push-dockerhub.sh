#!/usr/bin/env bash
# Build + push para Docker Hub (rode no seu Mac/CI, NÃO na VPS).
#
# Uso:
#   export DOCKERHUB_USER=stratostech
#   ./infra/deploy/push-dockerhub.sh
#
# Ou com tag:
#   DOCKERHUB_USER=stratostech IMAGE_TAG=v0.1.0 ./infra/deploy/push-dockerhub.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${1:-$ROOT/infra/deploy/.env}"

USER="${DOCKERHUB_USER:-stratostech}"
TAG="${IMAGE_TAG:-latest}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  USER="${DOCKERHUB_USER:-$USER}"
  TAG="${IMAGE_TAG:-$TAG}"
  API_IMAGE="${LAVA_API_IMAGE:-}"
  WEB_IMAGE="${LAVA_WEB_IMAGE:-}"
fi

if [[ -z "${USER}" ]]; then
  echo "Defina DOCKERHUB_USER (default: stratostech)"
  exit 1
fi

API_IMAGE="${LAVA_API_IMAGE:-${USER}/lava-rapido-api:${TAG}}"
WEB_IMAGE="${LAVA_WEB_IMAGE:-${USER}/lava-rapido-web:${TAG}}"

API_URL="${NEXT_PUBLIC_API_URL:-https://${API_HOST:-apilava.stratostech.com.br}}"
KC_URL="${NEXT_PUBLIC_KEYCLOAK_URL:-https://${KEYCLOAK_HOST:-authlava.stratostech.com.br}}"

echo "==> Login Docker Hub (se necessário)"
docker login

echo "==> Build + push API → $API_IMAGE"
docker build -f "$ROOT/apps/api/Dockerfile" -t "$API_IMAGE" "$ROOT"
docker push "$API_IMAGE"

echo "==> Build + push Web → $WEB_IMAGE"
docker build -f "$ROOT/Dockerfile.web" \
  --build-arg "NEXT_PUBLIC_API_URL=$API_URL" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_URL=$KC_URL" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_REALM=${KEYCLOAK_REALM:-lava-rapido}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-lava-rapido-web}" \
  -t "$WEB_IMAGE" \
  "$ROOT"
docker push "$WEB_IMAGE"

echo ""
echo "Imagens publicadas:"
echo "  LAVA_API_IMAGE=$API_IMAGE"
echo "  LAVA_WEB_IMAGE=$WEB_IMAGE"
echo ""
echo "Cole essas linhas nas variáveis do Portainer e faça Deploy / Update stack."
