#!/usr/bin/env bash
set -euo pipefail

echo "Building Docker image..."
docker build -t queryx-test .

echo "Starting container..."
docker run -d --name queryx-smoke -p 3000:3000 queryx-test
trap "docker rm -f queryx-smoke" EXIT

sleep 10

echo "Checking /health..."
curl -f http://localhost:3000/health || { echo "Health check failed"; exit 1; }

echo "Checking /v1/search x402 headers..."
curl -s -I http://localhost:3000/v1/search?q=test | grep -qi 'x-402' || { echo "Missing x402 header"; exit 1; }

echo "All checks passed!"