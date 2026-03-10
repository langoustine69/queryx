#!/bin/bash
# Smoke test script for QueryX deployment

set -e

# Get base URL from first argument or use default
BASE_URL="${1:-http://localhost:3000}"

echo "Running smoke tests against $BASE_URL"
echo "======================================"

# Test 1: Health check
echo "Test 1: Health check..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
    echo "FAIL: Health check returned HTTP $HTTP_CODE"
    echo "Response: $BODY"
    exit 1
fi

if ! echo "$BODY" | grep -q "ok"; then
    echo "FAIL: Health response does not contain 'ok'"
    echo "Response: $BODY"
    exit 1
fi

echo "PASS: Health check returned 200 with { status: 'ok' }"

# Test 2: /v1/search returns 402 without payment
echo ""
echo "Test 2: /v1/search without payment..."
SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/v1/search?q=test")
HTTP_CODE=$(echo "$SEARCH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "402" ]; then
    echo "FAIL: /v1/search should return 402 without payment, got $HTTP_CODE"
    exit 1
fi

echo "PASS: /v1/search returns 402 Payment Required without payment"

# Test 3: Verify x402 headers in 402 response
echo ""
echo "Test 3: Check x402 headers in 402 response..."
HEADERS=$(curl -s -D - "$BASE_URL/v1/search?q=test" -o /dev/null)

if ! echo "$HEADERS" | grep -qi "x402"; then
    echo "FAIL: 402 response missing x402 headers"
    echo "Headers: $HEADERS"
    exit 1
fi

echo "PASS: 402 response includes x402 headers"

echo ""
echo "======================================"
echo "All smoke tests passed!"
exit 0
