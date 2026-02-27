#!/bin/bash
# Queryx post-deploy smoke test
# Usage: ./scripts/smoke-test.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "✅ $desc (got $actual)"
    ((PASS++))
  else
    echo "❌ $desc (expected $expected, got $actual)"
    ((FAIL++))
  fi
}

echo "🔍 Smoke testing $BASE_URL"
echo "---"

# 1. Health returns 200
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health")
check "/health returns 200" "200" "$STATUS"

# 2. Health body has status: ok
BODY=$(curl -s "$BASE_URL/health")
if echo "$BODY" | grep -q '"status":"ok"'; then
  echo "✅ /health body contains status:ok"
  ((PASS++))
else
  echo "❌ /health body missing status:ok — got: $BODY"
  ((FAIL++))
fi

# 3. Search returns 402 without payment
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/v1/search?q=test")
check "/v1/search returns 402 without payment" "402" "$STATUS"

# 4. News returns 402
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/v1/search/news?q=test")
check "/v1/search/news returns 402 without payment" "402" "$STATUS"

# 5. Deep returns 402
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"query":"test"}' "$BASE_URL/v1/search/deep")
check "/v1/search/deep returns 402 without payment" "402" "$STATUS"

echo "---"
echo "Results: $PASS passed, $FAIL failed"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
