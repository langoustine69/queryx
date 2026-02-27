# Queryx Agent Guide

> This guide is for AI agents consuming the Queryx API programmatically.

## Overview

Queryx is a web search API that returns AI-synthesized answers with source citations. Payment is per-query via the [x402 protocol](https://x402.org) using USDC on Base Mainnet.

## Endpoints

| Endpoint | Method | Cost | Description |
|----------|--------|------|-------------|
| `/v1/search?q=...` | GET | $0.001 USDC | Web search + synthesis |
| `/v1/search/news?q=...` | GET | $0.001 USDC | News-focused search |
| `/v1/search/deep` | POST | $0.005 USDC | Multi-source deep research |
| `/health` | GET | Free | Health check |

## x402 Payment Flow

1. **Make a request without payment** → Server returns `HTTP 402`
2. **Parse the 402 response** — headers contain:
   - `X-PAYMENT-REQUIRED`: JSON with payment requirements
   - Includes: `receiverAddress`, `amount`, `network`, `facilitatorUrl`
3. **Construct payment proof** — Sign a USDC transfer on Base using your wallet
4. **Retry with `X-PAYMENT` header** — Include the signed payment proof
5. **Server validates via facilitator** → Returns `200` with search results

### Example (pseudo-code)

```
# Step 1: Initial request
GET /v1/search?q=quantum+computing HTTP/1.1
→ 402 Payment Required
→ X-PAYMENT-REQUIRED: {"amount":"0.001","currency":"USDC","network":"base",...}

# Step 2: Retry with payment
GET /v1/search?q=quantum+computing HTTP/1.1
X-PAYMENT: <signed-payment-proof>
→ 200 OK
→ {"query":"quantum computing","answer":"...","sources":[...],...}
```

### Using `@x402/fetch`

```typescript
import { createX402Fetch } from "@x402/fetch";

const x402Fetch = createX402Fetch({ privateKey: "0x..." });
const res = await x402Fetch("https://queryx.run/v1/search?q=test");
const data = await res.json();
```

## Response Format

All paid endpoints return:

```json
{
  "query": "your query",
  "answer": "Synthesized answer from multiple sources...",
  "sources": [
    { "title": "Source Title", "url": "https://...", "snippet": "...", "published": "2026-02-27T..." }
  ],
  "confidence": 0.87,
  "freshness": { "fetchedAt": "2026-02-27T10:00:00Z", "resultsAge": "4h" },
  "model": "queryx-fast-v1",
  "tokens": { "in": 312, "out": 187 }
}
```

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 400 | Invalid query/body | Fix request parameters |
| 402 | Payment required | Construct and include x402 payment |
| 429 | Rate limited | Back off and retry |
| 500 | Server error | Retry with exponential backoff |

## Best Practices

- **Cache responses** client-side for repeated queries (server caches for 5 min)
- **Use `/v1/search`** for quick lookups, `/v1/search/deep` for research tasks
- **Check `confidence`** — below 0.5 may indicate low-quality sources
- **Use `count` parameter** — fewer sources = faster + cheaper synthesis
