# Queryx — Pricing

Queryx endpoints are priced in **USDC on Base** and collected via **x402**.

Reference: https://x402.org

## Per-endpoint pricing

- `GET /v1/search`: **$0.001 USDC** per call
- `GET /v1/search/news`: **$0.001 USDC** per call
- `POST /v1/search/deep`: **$0.005 USDC** per call
- `GET /health`: free

## Base units

USDC has 6 decimals.

- $0.001 USDC = **1000** (micro-USDC)
- $0.005 USDC = **5000** (micro-USDC)

## Cost comparison (rough, for positioning)

This table is intentionally high-level; prices vary by plan and time.

- Queryx: predictable, per-call USDC micropayments (x402)
- Perplexity/Tavily/Brave: subscription or API-key based; often higher fixed costs

## Example monthly spend

Assuming average mix of endpoints:

- 1k calls of `/v1/search` → **$1.00**
- 10k calls of `/v1/search` → **$10.00**
- 100k calls of `/v1/search` → **$100.00**

Deep research:

- 1k calls of `/v1/search/deep` → **$5.00**

## Facilitator address

Payment facilitator address is implementation/config dependent. If you need the address, call a paid endpoint and parse the `402` instructions.
