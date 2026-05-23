#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-$(cd "$(dirname "$0")/../.." && pwd)/infra/deploy/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não existe."
  echo "Rode: cp infra/deploy/.env.example infra/deploy/.env"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

required=(
  WEB_HOST
  API_HOST
  KEYCLOAK_HOST
  KEYCLOAK_HOSTNAME
  POSTGRES_USER
  POSTGRES_PASSWORD
  POSTGRES_DB
  KEYCLOAK_ADMIN
  KEYCLOAK_ADMIN_PASSWORD
  MINIO_ACCESS_KEY
  MINIO_SECRET_KEY
)

missing=()
for key in "${required[@]}"; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    missing+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Preencha no .env:"
  for key in "${missing[@]}"; do
    echo "  - $key"
  done
  exit 1
fi

if [[ "$POSTGRES_PASSWORD" == CHANGE_ME* ]] || [[ "$POSTGRES_PASSWORD" == "troque-esta-senha-postgres" ]]; then
  echo "Erro: altere POSTGRES_PASSWORD no .env"
  exit 1
fi

if [[ "$KEYCLOAK_ADMIN_PASSWORD" == CHANGE_ME* ]] || [[ "$KEYCLOAK_ADMIN_PASSWORD" == "troque-esta-senha-keycloak" ]]; then
  echo "Erro: altere KEYCLOAK_ADMIN_PASSWORD no .env"
  exit 1
fi

if [[ "$MINIO_ACCESS_KEY" == CHANGE_ME* ]]; then
  echo "Erro: altere MINIO_ACCESS_KEY no .env"
  exit 1
fi

if [[ "$MINIO_SECRET_KEY" == CHANGE_ME* ]]; then
  echo "Erro: altere MINIO_SECRET_KEY no .env"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Erro: Docker não está acessível."
  exit 1
fi

if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
  echo "Erro: Docker Swarm não está ativo. Rode: docker swarm init"
  exit 1
fi

if ! docker network inspect "${DOCKER_NETWORK:-HMLStratosNetwork}" >/dev/null 2>&1; then
  echo "Erro: rede ${DOCKER_NETWORK:-HMLStratosNetwork} não existe (mesma rede do MinIO)."
  exit 1
fi

echo "Ambiente OK."
