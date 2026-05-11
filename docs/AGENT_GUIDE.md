# Queryx Agent Guide

Queryx is a paid JSON search API for autonomous agents. Use it when an agent needs current web evidence, recent news, or a deeper multi-source synthesis without creating an account.

## Base URL

Production:

```text
https://queryx.run
```

Local development:

```text
http://localhost:3000
```

## Endpoints

| Endpoint | Method | Price | Use |
| --- | --- | ---: | --- |
| `/v1/search` | `GET` | `0.001` USDC | General web search and synthesis |
| `/v1/search/news` | `GET` | `0.001` USDC | Recent news-oriented search |
| `/v1/search/deep` | `POST` | `0.005` USDC | Deeper multi-source research |
| `/health` | `GET` | Free | Service readiness |

## Payment Flow

Queryx uses x402 payment challenges.

1. Send the intended request without a payment header.
2. Read the `402 Payment Required` response.
3. Parse either `WWW-Authenticate` or `X-Accepted-Payment`.
4. Sign the returned payment challenge with an x402-compatible wallet on the declared network.
5. Retry the same request with one of these headers:

```text
X-PAYMENT: <serialized x402 payment>
PAYMENT: <serialized x402 payment>
PAYMENT-SIGNATURE: <compatible payment signature>
```

Agents should treat the JSON `error.details` object in the 402 response as the canonical payment metadata. It includes:

| Field | Meaning |
| --- | --- |
| `price` | Endpoint price in USDC |
| `payTo` | Receivable wallet address |
| `network` | Payment network, default `base` |
| `facilitatorUrl` | x402 facilitator used for settlement |
| `x402Version` | Payment protocol version |

## Example: Get A Payment Challenge

```bash
curl -i "https://queryx.run/v1/search?q=bitcoin%20ETF%20flows"
```

Expected response:

```http
HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 <challenge>
X-Accepted-Payment: <challenge>
Content-Type: application/json
```

```json
{
  "error": {
    "code": "PAYMENT_REQUIRED",
    "message": "x402 payment is required for this endpoint",
    "details": {
      "price": "0.001",
      "payTo": "0x0000000000000000000000000000000000000000",
      "network": "base",
      "facilitatorUrl": "https://facilitator.daydreams.systems",
      "x402Version": 2
    }
  }
}
```

## Example: Paid Web Search

```bash
curl \
  -H "X-PAYMENT: <serialized-x402-payment>" \
  "https://queryx.run/v1/search?q=Fed%20rate%20decision%20impact%20on%20tech%20stocks"
```

Response shape:

```json
{
  "query": "Fed rate decision impact on tech stocks",
  "answer": "A concise synthesized answer for the agent.",
  "sources": [
    {
      "title": "Source title",
      "url": "https://example.com/source",
      "snippet": "Evidence excerpt.",
      "published": "2026-05-11T04:00:00.000Z"
    }
  ],
  "confidence": 0.78,
  "freshness": {
    "fetchedAt": "2026-05-11T04:00:00.000Z",
    "resultsAge": "1 hour"
  },
  "model": "queryx-fast-v1",
  "tokens": {
    "in": 31,
    "out": 256
  }
}
```

## Example: Paid News Search

```bash
curl \
  -H "X-PAYMENT: <serialized-x402-payment>" \
  "https://queryx.run/v1/search/news?q=latest%20ethereum%20ETF%20inflows"
```

Use this endpoint when recency matters more than evergreen relevance.

## Example: Paid Deep Search

```bash
curl \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <serialized-x402-payment>" \
  -d '{"query":"Compare Brave, Tavily, and Perplexity pricing for agent search","depth":"deep"}' \
  "https://queryx.run/v1/search/deep"
```

Use this endpoint for comparison, diligence, and multi-source synthesis tasks.

## Error Handling

| Status | Code | Agent behavior |
| ---: | --- | --- |
| `400` | `BAD_REQUEST` | Fix missing or invalid query input and retry. |
| `402` | `PAYMENT_REQUIRED` | Complete the x402 payment flow and retry the same request. |
| `422` | `BAD_REQUEST` | Fix malformed JSON body and retry. |
| `429` | `RATE_LIMITED` | Back off and retry later. |
| `500` | `INTERNAL_ERROR` | Retry with exponential backoff or fall back to another source. |

## Best Practices

- Cache identical queries client-side when freshness is not critical.
- Use `/v1/search/news` only for explicitly time-sensitive questions.
- Use `/v1/search/deep` for tasks that need cross-source reconciliation.
- Preserve returned `sources` with any downstream answer to keep auditability.
- Do not reuse a payment challenge across materially different requests unless the x402 facilitator explicitly permits it.

