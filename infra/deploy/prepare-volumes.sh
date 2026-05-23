#!/usr/bin/env bash
# Verifica rede Docker (volumes são criados automaticamente pelo stack).
set -euo pipefail

NETWORK="${DOCKER_NETWORK:-HMLStratosNetwork}"

if docker network inspect "$NETWORK" >/dev/null 2>&1; then
  echo "Rede $NETWORK OK."
else
  echo "Erro: rede $NETWORK não existe (mesma rede do MinIO)."
  echo "Crie ou confira o nome em DOCKER_NETWORK no .env"
  exit 1
fi

echo "Volumes lava_postgres_data e lava_redis_data serão criados pelo stack (não precisa criar manualmente)."
