#!/usr/bin/env bash
set -euo pipefail

PROXY_URL="${PROXY_URL:-http://localhost:3000}"
FAKE_API_URL="${FAKE_API_URL:-http://localhost:4000}"
USER_ID="${USER_ID:-user-1}"

echo "[smoke] proxy health"
curl -sS "$PROXY_URL/health"
echo

echo "[smoke] fake api health"
curl -sS "$FAKE_API_URL/health"
echo

echo "[smoke] proxied create_post request"
curl -sS -i \
  -X POST "$PROXY_URL/posts" \
  -H "Authorization: Bearer $USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"smoke test"}'
echo
