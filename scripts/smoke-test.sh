#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

health_body=""
for _ in {1..30}; do
  if health_body="$(curl -fsS "${BASE_URL}/health" 2>/dev/null)"; then
    break
  fi
  sleep 1
done

if [[ -z "${health_body}" ]]; then
  echo "Timed out waiting for ${BASE_URL}/health" >&2
  exit 1
fi

if [[ "${health_body}" != *'"status":"ok"'* && "${health_body}" != *'"status": "ok"'* ]]; then
  echo "Unexpected /health response: ${health_body}" >&2
  exit 1
fi

response_headers="$(mktemp)"
response_body="$(mktemp)"
trap 'rm -f "${response_headers}" "${response_body}"' EXIT

status_code="$(
  curl -sS -o "${response_body}" \
    -D "${response_headers}" \
    -w "%{http_code}" \
    "${BASE_URL}/v1/search?q=smoke"
)"

if [[ "${status_code}" != "402" ]]; then
  echo "Expected /v1/search to return 402, got ${status_code}" >&2
  cat "${response_body}" >&2
  exit 1
fi

if ! grep -qi '^x-402-network:' "${response_headers}"; then
  echo "Missing x-402-network header" >&2
  cat "${response_headers}" >&2
  exit 1
fi

if ! grep -qi '^x-402-price-usdc:' "${response_headers}"; then
  echo "Missing x-402-price-usdc header" >&2
  cat "${response_headers}" >&2
  exit 1
fi

echo "Smoke test passed for ${BASE_URL}"
