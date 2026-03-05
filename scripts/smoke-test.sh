#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name — $result"
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke test: $BASE_URL"
echo "---"

# Test /health returns 200
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$status" = "200" ]; then
  check "/health returns 200" "ok"
else
  check "/health returns 200" "got $status"
fi

# Test /health returns {"status":"ok"}
body=$(curl -s "$BASE_URL/health")
if echo "$body" | grep -q '"status"'; then
  check "/health body has status field" "ok"
else
  check "/health body has status field" "got: $body"
fi

# Test /v1/search returns 402 without payment
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/v1/search?q=test")
if [ "$status" = "402" ]; then
  check "/v1/search returns 402 without payment" "ok"
else
  check "/v1/search returns 402 without payment" "got $status"
fi

# Test 402 response has x402 headers
headers=$(curl -sI "$BASE_URL/v1/search?q=test")
if echo "$headers" | grep -qi "x-payment\|402\|payment-required"; then
  check "402 response has payment headers" "ok"
else
  check "402 response has payment headers" "missing payment headers"
fi

echo "---"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
