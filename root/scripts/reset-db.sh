#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-rate_limiter}"
POSTGRES_DB="${POSTGRES_DB:-rate_limiter}"

cd "$ROOT_DIR"

docker compose -f "$COMPOSE_FILE" up -d "$POSTGRES_SERVICE"

echo "[reset-db] waiting for postgres"
until docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 1
done

echo "[reset-db] dropping mock tables"
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  'DROP TABLE IF EXISTS rate_limit_windows CASCADE; DROP TABLE IF EXISTS rate_limit_rules CASCADE; DROP TABLE IF EXISTS users CASCADE;'

echo "[reset-db] pushing schema"
npm --prefix proxy-server run db:push

echo "[reset-db] seeding rules"
npm --prefix proxy-server run db:seed

echo "[reset-db] done"
