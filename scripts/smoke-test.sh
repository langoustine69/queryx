#!/usr/bin/env bash
set -e

BASE_URL=${BASE_URL:-http://localhost:3000}

echo "Testing health endpoint..."
curl -f -s "$BASE_URL/health" || { echo "Health check failed"; exit 1; }
echo "✓ /health returns 200"

echo "Testing /v1/search without payment..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/v1/search?q=test")
if [ "$HTTP_STATUS" != "402" ]; then
  echo "Expected 402 Payment Required, got $HTTP_STATUS"
  exit 1
fi
echo "✓ /v1/search returns 402 without payment"

echo "Testing x402 headers..."
curl -s -I "$BASE_URL/v1/search?q=test" | grep -i "x402-price" || { echo "Missing X402-Price header"; exit 1; }
echo "✓ x402 headers present"

echo "All smoke tests passed!"