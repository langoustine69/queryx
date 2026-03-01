#!/bin/bash
# Queryx post-deploy smoke test
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Example: ./scripts/smoke-test.sh https://queryx.run

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASSED=0
FAILED=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red() { echo -e "\033[31m✗ $1\033[0m"; }

echo "=== Queryx Smoke Test ==="
echo "Target: $BASE_URL"
echo ""

# Test 1: Health endpoint returns 200
echo "Test 1: GET /health returns 200"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
  green "/health returned 200"
  PASSED=$((PASSED + 1))
else
  red "/health returned $HTTP_CODE (expected 200)"
  FAILED=$((FAILED + 1))
fi

# Test 2: Health response body
echo "Test 2: /health returns {\"status\":\"ok\"}"
BODY=$(curl -s "$BASE_URL/health")
if echo "$BODY" | grep -q '"status"'; then
  green "/health body contains status field"
  PASSED=$((PASSED + 1))
else
  red "/health body missing status field: $BODY"
  FAILED=$((FAILED + 1))
fi

# Test 3: Search endpoint returns 402 without payment
echo "Test 3: GET /v1/search returns 402 without payment"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/v1/search?q=test")
if [ "$HTTP_CODE" = "402" ]; then
  green "/v1/search returned 402 (Payment Required)"
  PASSED=$((PASSED + 1))
else
  red "/v1/search returned $HTTP_CODE (expected 402)"
  FAILED=$((FAILED + 1))
fi

# Test 4: 402 response has x402 headers
echo "Test 4: 402 response includes x402 payment headers"
HEADERS=$(curl -s -D - -o /dev/null "$BASE_URL/v1/search?q=test" 2>&1)
if echo "$HEADERS" | grep -qi 'x-payment\|x402\|payment-required\|www-authenticate'; then
  green "402 response contains payment-related headers"
  PASSED=$((PASSED + 1))
else
  red "402 response missing x402 headers"
  FAILED=$((FAILED + 1))
fi

# Test 5: News search also returns 402
echo "Test 5: GET /v1/search/news returns 402 without payment"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/v1/search/news?q=test")
if [ "$HTTP_CODE" = "402" ]; then
  green "/v1/search/news returned 402"
  PASSED=$((PASSED + 1))
else
  red "/v1/search/news returned $HTTP_CODE (expected 402)"
  FAILED=$((FAILED + 1))
fi

# Test 6: Deep search also returns 402
echo "Test 6: POST /v1/search/deep returns 402 without payment"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"query":"test"}' "$BASE_URL/v1/search/deep")
if [ "$HTTP_CODE" = "402" ]; then
  green "/v1/search/deep returned 402"
  PASSED=$((PASSED + 1))
else
  red "/v1/search/deep returned $HTTP_CODE (expected 402)"
  FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=== Results ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ "$FAILED" -gt 0 ]; then
  red "SMOKE TEST FAILED"
  exit 1
else
  green "ALL SMOKE TESTS PASSED"
  exit 0
fi
