# Queryx Agent Guide

This guide is written for AI agents that want to use Queryx for web search. It covers the x402 payment protocol, endpoint usage, error handling, and best practices.

## Overview

Queryx is an agent-native search API. You pay per query in USDC on Base via the x402 protocol. No API keys, no accounts, no subscriptions.

- **Base URL**: `https://queryx.run`
- **Payment**: x402 USDC on Base mainnet
- **Response format**: JSON

## How x402 Payment Works

Queryx uses the [x402 protocol](https://x402.org) for payments. Here is the flow:

### Step 1: Make an initial request (no payment)

```
GET https://queryx.run/v1/search?q=your+query
```

The server responds with **HTTP 402 Payment Required** and a JSON body:

```json
{
  "error": "Payment required",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base-mainnet",
    "maxAmountRequired": "1000",
    "payTo": "0x...",
    "resource": "https://queryx.run/v1/search?q=your+query",
    "maxTimeoutSeconds": 60
  }
}
```

### Step 2: Construct and sign the payment

1. Read `paymentRequirements` from the 402 response
2. Create an EIP-712 typed data signature authorizing a USDC transfer of `maxAmountRequired` (in base units, 6 decimals) to the `payTo` address
3. The signature must be from a wallet with sufficient USDC balance on Base

### Step 3: Retry with payment header

```
GET https://queryx.run/v1/search?q=your+query
X-PAYMENT: <base64-encoded-payment-payload>
```

The `X-PAYMENT` header contains the signed payment authorization. The facilitator verifies and settles the payment, then the server returns the search results.

### Libraries

- **JavaScript/TypeScript**: Use `@anthropic-ai/x402` or `x402-js` package
- **Python**: Use `x402-python` package
- Both handle the 402 flow automatically

## Endpoints

### GET /v1/search

General web search with AI-synthesized answer.

**Cost**: $0.001 USDC (1000 base units)

**Parameters**:
- `q` (required): Search query string, 1-500 characters

**Response**:
```json
{
  "query": "latest Ethereum gas prices",
  "answer": "Current Ethereum gas prices are around 15-25 gwei for standard transactions...",
  "sources": [
    {
      "title": "Ethereum Gas Tracker - Etherscan",
      "url": "https://etherscan.io/gastracker",
      "snippet": "Current gas prices..."
    }
  ]
}
```

### GET /v1/search/news

News-focused search. Results prioritized by recency.

**Cost**: $0.001 USDC (1000 base units)

**Parameters**:
- `q` (required): News search query, 1-500 characters

**Response**: Same schema as `/v1/search`

### POST /v1/search/deep

Multi-source deep research. Performs iterative search and synthesis.

**Cost**: $0.005 USDC (5000 base units)

**Request body**:
```json
{
  "query": "Compare optimistic vs zk rollups for DeFi applications",
  "depth": 3
}
```

- `query` (required): Research query, 1-1000 characters
- `depth` (optional): Number of research iterations, 1-5 (default: 3)

**Response**:
```json
{
  "query": "Compare optimistic vs zk rollups for DeFi applications",
  "answer": "Detailed multi-paragraph analysis...",
  "sources": [...],
  "iterations": 3
}
```

### GET /health

Health check. Free, no payment required.

**Response**:
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

## Handling 402 Responses Programmatically

```python
import requests
from x402 import create_payment_header

def queryx_search(query, wallet_key):
    url = f"https://queryx.run/v1/search?q={query}"
    
    # First request - will get 402
    resp = requests.get(url)
    
    if resp.status_code == 402:
        requirements = resp.json()["paymentRequirements"]
        payment_header = create_payment_header(
            requirements=requirements,
            private_key=wallet_key
        )
        # Retry with payment
        resp = requests.get(url, headers={"X-PAYMENT": payment_header})
    
    return resp.json()
```

## Rate Limits

- **Standard search**: 60 requests/minute per wallet
- **Deep search**: 10 requests/minute per wallet
- Rate limit headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- On 429, wait `retryAfter` seconds before retrying

## Best Practices

1. **Cache results**: If you search the same query within minutes, cache the response locally
2. **Use news endpoint for recent events**: The news endpoint prioritizes recency, use it for time-sensitive queries
3. **Start with standard search**: Only use deep search when you need comprehensive research; it costs 5x more
4. **Handle 402 automatically**: Use an x402 client library to handle the payment flow transparently
5. **Check /health first**: Verify the service is up before making paid requests
6. **Keep USDC on Base**: Ensure your wallet has USDC on Base mainnet (chain ID 8453)
