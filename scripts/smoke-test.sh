#!/bin/bash
# Queryx Smoke Test Script
# Tests deployment health and payment endpoints

set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=10

echo "=========================================="
echo "Queryx Smoke Test"
echo "=========================================="
echo "Testing: $BASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing: $name... "
    
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $status)"
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected: $expected_status, Got: $status)"
        return 1
    fi
}

fail_count=0

# Test 1: Health endpoint returns 200
if ! test_endpoint "Health Check" "$BASE_URL/health" "200"; then
    ((fail_count++))
fi

# Test 2: Search without payment returns 402
if ! test_endpoint "Search (No Payment)" "$BASE_URL/v1/search?q=test" "402"; then
    ((fail_count++))
fi

# Test 3: Check for x402 payment headers
echo -n "Testing: Payment Headers... "
headers=$(curl -s -I --max-time $TIMEOUT "$BASE_URL/v1/search?q=test" || true)
if echo "$headers" | grep -qi "x-payments-required"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} (Missing x-payments-required header)"
    ((fail_count++))
fi

echo ""
echo "=========================================="
if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}$fail_count test(s) failed${NC}"
    exit 1
fi
