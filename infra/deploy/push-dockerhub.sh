#!/usr/bin/env bash
# Build + push para Docker Hub (rode no Mac/CI, NÃO na VPS).
#
# IMPORTANTE: VPS Linux usa amd64. Mac Apple Silicon gera arm64 por padrão —
# este script força --platform linux/amd64 (ou DOCKER_PLATFORM).
#
# Uso:
#   ./infra/deploy/push-dockerhub.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${1:-$ROOT/infra/deploy/.env}"

USER="${DOCKERHUB_USER:-stratostech}"
TAG="${IMAGE_TAG:-latest}"
PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  USER="${DOCKERHUB_USER:-$USER}"
  TAG="${IMAGE_TAG:-$TAG}"
fi

API_IMAGE="${LAVA_API_IMAGE:-${USER}/lava-rapido-api:${TAG}}"
WEB_IMAGE="${LAVA_WEB_IMAGE:-${USER}/lava-rapido-web:${TAG}}"
KC_IMAGE="${LAVA_KEYCLOAK_IMAGE:-${USER}/lava-keycloak:${TAG}}"

API_URL="${NEXT_PUBLIC_API_URL:-https://${API_HOST:-apilava.stratostech.com.br}}"
KC_URL="${NEXT_PUBLIC_KEYCLOAK_URL:-https://${KEYCLOAK_HOST:-authlava.stratostech.com.br}}"

echo "==> Plataforma: $PLATFORM"
echo "==> Login Docker Hub (se necessário)"
docker login

build_push() {
  local tag=$1
  shift
  docker build --platform "$PLATFORM" "$@" -t "$tag" "$ROOT"
  docker push "$tag"
}

echo "==> Build + push API → $API_IMAGE"
build_push "$API_IMAGE" -f "$ROOT/apps/api/Dockerfile"

echo "==> Build + push Web → $WEB_IMAGE"
build_push "$WEB_IMAGE" -f "$ROOT/Dockerfile.web" \
  --build-arg "NEXT_PUBLIC_API_URL=$API_URL" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_URL=$KC_URL" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_REALM=${KEYCLOAK_REALM:-lava-rapido}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-lava-rapido-web}"

echo "==> Build + push Keycloak → $KC_IMAGE"
build_push "$KC_IMAGE" -f "$ROOT/Dockerfile.keycloak"

echo ""
echo "Imagens publicadas ($PLATFORM):"
echo "  LAVA_API_IMAGE=$API_IMAGE"
echo "  LAVA_WEB_IMAGE=$WEB_IMAGE"
echo "  LAVA_KEYCLOAK_IMAGE=$KC_IMAGE"
echo ""
echo "Portainer → Pull and redeploy da stack."
