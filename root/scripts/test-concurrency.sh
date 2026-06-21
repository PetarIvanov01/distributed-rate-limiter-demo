#!/usr/bin/env bash
set -euo pipefail

DEFAULT_PROXY_URLS="http://localhost:3000 http://localhost:3001 http://localhost:3002"
PROXY_URLS="${PROXY_URLS:-${PROXY_URL:-$DEFAULT_PROXY_URLS}}"
USER_ID="${USER_ID:-user-1}"
REQUESTS="${REQUESTS:-20}"
METHOD="${METHOD:-POST}"
PATHNAME="${PATHNAME:-/posts}"
BODY="${BODY:-{\"title\":\"concurrency test\"}}"
read -r -a PROXY_URL_ARRAY <<< "$PROXY_URLS"

if [ "${#PROXY_URL_ARRAY[@]}" -eq 0 ]; then
  echo "[concurrency] no proxy URLs configured"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "[concurrency] sending requests"
echo "[concurrency] user=$USER_ID method=$METHOD path=$PATHNAME requests=$REQUESTS"
echo "[concurrency] proxy_urls=$PROXY_URLS"

for request_number in $(seq 1 "$REQUESTS"); do
  proxy_index=$(( (request_number - 1) % ${#PROXY_URL_ARRAY[@]} ))
  proxy_url="${PROXY_URL_ARRAY[$proxy_index]}"

  (
    curl -sS -o "$TMP_DIR/body-$request_number.txt" \
      -w "%{http_code}\n" \
      -X "$METHOD" "$proxy_url$PATHNAME" \
      -H "Authorization: Bearer $USER_ID" \
      -H "Content-Type: application/json" \
      -d "$BODY" > "$TMP_DIR/status-$request_number.txt"

    echo "$proxy_url" > "$TMP_DIR/proxy-$request_number.txt"
  ) &
done

wait

echo "[concurrency] status summary"
cat "$TMP_DIR"/status-*.txt | sort | uniq -c

echo "[concurrency] proxy distribution"
cat "$TMP_DIR"/proxy-*.txt | sort | uniq -c

echo "[concurrency] expected for seeded user-1 create_post: 5 x 201 and the rest 429"
