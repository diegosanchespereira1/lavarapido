#!/usr/bin/env bash
# Setup local Lava Rápido MVP — Postgres + Redis + schema + seed
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Instalando dependências npm..."
npm install

echo "==> Subindo Postgres e Redis (Docker)..."
if ! docker info >/dev/null 2>&1; then
  echo "ERRO: Docker não está rodando. Abra o Docker Desktop e execute este script novamente."
  exit 1
fi

docker compose -f infra/docker/docker-compose.yml up -d postgres redis

echo "==> Aguardando Postgres..."
until docker compose -f infra/docker/docker-compose.yml exec -T postgres pg_isready -U lava >/dev/null 2>&1; do
  sleep 1
done

export DATABASE_URL="${DATABASE_URL:-postgres://lava:lava_dev@localhost:5433/lava_rapido}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6380/0}"
export PORT="${PORT:-3011}"
export DEV_AUTH=true

echo "==> Aplicando schema (drizzle push)..."
npm --workspace=@lava-rapido/api run db:push

echo "==> Seed demo (tenant, filiais, tipos, clientes)..."
npm --workspace=@lava-rapido/api run db:seed

echo ""
echo "✓ Setup concluído!"
echo ""
echo "  npm run dev          # web :3012 + api :3011"
echo "  Abra http://localhost:3012/login"
echo "  Use 'Entrar como Admin Demo' para validar o MVP"
echo ""
