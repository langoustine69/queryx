#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

health_status="$(curl -s -o /tmp/queryx-health.json -w "%{http_code}" "$BASE_URL/health")"
if [ "$health_status" != "200" ]; then
  cat /tmp/queryx-health.json
  exit 1
fi

search_status="$(curl -s -o /tmp/queryx-search.json -w "%{http_code}" "$BASE_URL/v1/search?q=test")"
if [ "$search_status" != "402" ]; then
  cat /tmp/queryx-search.json
  exit 1
fi

required_header="$(curl -s -D - -o /tmp/queryx-search-headers.json "$BASE_URL/v1/search?q=test" | tr -d '\r' | grep -i '^x-402-payment-required: true$' || true)"
if [ -z "$required_header" ]; then
  curl -s -D - -o /tmp/queryx-search-headers.json "$BASE_URL/v1/search?q=test"
  exit 1
fi

echo "Smoke test passed for $BASE_URL"
