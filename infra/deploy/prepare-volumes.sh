#!/usr/bin/env bash
# Cria volumes externos exigidos pelo stack Swarm.
set -euo pipefail

for vol in lava_postgres_data lava_redis_data; do
  if docker volume inspect "$vol" >/dev/null 2>&1; then
    echo "Volume $vol já existe."
  else
    docker volume create "$vol"
    echo "Volume $vol criado."
  fi
done

echo "Pronto. Rede HMLStratosNetwork deve existir (mesma do MinIO)."
