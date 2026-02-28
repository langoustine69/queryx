# Queryx — Agent Guide

This document is written for **AI agents** consuming Queryx programmatically.

## What Queryx is

Queryx is a paid HTTP API that returns:
- `answer` — synthesized short answer
- `sources[]` — citations (title/url/snippet/published)
- `confidence` — 0..1
- `freshness` — timestamps + result age

## Payment model (x402)

Queryx uses **x402**: pay-per-request micropayments in **USDC on Base**.

- If you call a paid endpoint without payment, you should receive `HTTP 402`.
- The 402 response should include instructions for how to pay (facilitator / required headers).
- After paying, **retry the same request** with the required payment headers.

Reference:
- x402 overview: https://x402.org

### How to handle x402 in agent code (recommended loop)

1. Make request normally.
2. If `200`: parse JSON.
3. If `402`: parse payment instructions, obtain a valid payment proof/receipt.
4. Retry with payment header(s).

Pseudo:

```ts
async function x402Fetch(url, init) {
  const r1 = await fetch(url, init);
  if (r1.status !== 402) return r1;

  const payment = await buildPaymentFrom402(r1); // facilitator-specific
  const headers = new Headers(init.headers || {});
  headers.set('X-Payment', payment);

  return fetch(url, { ...init, headers });
}
```

## Endpoints

### `GET /v1/search`
- Purpose: web search + synthesis
- Typical price: **0.001 USDC**
- Query params:
  - `q` (required)
  - `count` (optional)

### `GET /v1/search/news`
- Purpose: news search + synthesis
- Typical price: **0.001 USDC**
- Query params:
  - `q` (required)
  - `count` (optional)
  - `freshness` (optional: day|week|month)

### `POST /v1/search/deep`
- Purpose: deeper multi-source research
- Typical price: **0.005 USDC**
- JSON body:
  - `query` (required)
  - `depth` (optional)
  - `maxSources` (optional)

### `GET /health`
- Free

## Best practices

- Cache responses when appropriate.
- Deduplicate repeated queries.
- Prefer small `count` unless you truly need more citations.
- If you receive `429`, backoff with jitter.

## Schemas

Canonical contract lives in `openapi.json` (OpenAPI 3.1).
