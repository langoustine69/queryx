#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${QUERYX_BASE_URL:-http://localhost:3000}}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

health_body="$tmp_dir/health.json"
health_status="$(curl -fsS -o "$health_body" -w '%{http_code}' "$BASE_URL/health")"
if [[ "$health_status" != "200" ]]; then
  echo "expected /health to return 200, got $health_status"
  exit 1
fi

if ! grep -q '"status":"ok"' "$health_body"; then
  echo "expected /health body to contain status ok"
  exit 1
fi

search_headers="$tmp_dir/search.headers"
search_body="$tmp_dir/search.json"
search_status="$(curl -sS -D "$search_headers" -o "$search_body" -w '%{http_code}' "$BASE_URL/v1/search?q=railway")"
if [[ "$search_status" != "402" ]]; then
  echo "expected unpaid /v1/search to return 402, got $search_status"
  exit 1
fi

if ! grep -qi '^x402-version: 1' "$search_headers"; then
  echo "expected unpaid /v1/search response to include x402-version header"
  exit 1
fi

if ! grep -q '"payment_required"' "$search_body"; then
  echo "expected unpaid /v1/search body to explain payment_required"
  exit 1
fi

echo "Smoke test passed for $BASE_URL"
