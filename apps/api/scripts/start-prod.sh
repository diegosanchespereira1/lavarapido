#!/bin/sh
set -e

cd /repo/apps/api

if [ "$RUN_DB_PUSH" = "true" ]; then
  echo "[lava-api] Aplicando schema (drizzle-kit push)..."
  npx drizzle-kit push
fi

if [ "$RUN_DB_SEED" = "true" ]; then
  echo "[lava-api] Populando seed demo..."
  npx tsx scripts/seed.ts
fi

exec node dist/index.js
