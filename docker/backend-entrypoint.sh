#!/bin/sh
set -e

echo "=================================================================="
echo "[LuminaFM Bootstrap] Waiting for PostgreSQL database readiness..."
echo "=================================================================="

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-luminafm}"
DB_NAME="${POSTGRES_DB:-luminafm_db}"

MAX_RETRIES=30
RETRY_COUNT=0

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "[LuminaFM Bootstrap] ERROR: PostgreSQL did not become ready in time."
    exit 1
  fi
  echo "[LuminaFM Bootstrap] PostgreSQL unavailable (attempt $RETRY_COUNT/$MAX_RETRIES) - sleeping 2s..."
  sleep 2
done

echo "[LuminaFM Bootstrap] PostgreSQL is ready on ${DB_HOST}:${DB_PORT}/${DB_NAME}."

echo "=================================================================="
echo "[LuminaFM Bootstrap] Applying Prisma schema migrations..."
echo "=================================================================="
if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "[LuminaFM Bootstrap] No migration history directory detected; syncing schema with 'prisma db push'..."
  npx prisma db push --accept-data-loss
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "=================================================================="
  echo "[LuminaFM Bootstrap] Running idempotent database seed ('Kingsbury Hotel')..."
  echo "=================================================================="
  npm run seed
fi

echo "=================================================================="
echo "[LuminaFM Bootstrap] Starting LuminaFM Core API Server..."
echo "=================================================================="
exec node dist/server.js

