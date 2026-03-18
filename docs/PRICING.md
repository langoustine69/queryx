# Queryx Pricing

All payments are in USDC on Base mainnet via the x402 protocol. No accounts or subscriptions required.

## Per-Endpoint Costs

| Endpoint | USDC Cost | Base Units (6 decimals) | Description |
|----------|-----------|------------------------|-------------|
| `GET /v1/search` | $0.001 | 1,000 | Web search + AI synthesis |
| `GET /v1/search/news` | $0.001 | 1,000 | News-focused search |
| `POST /v1/search/deep` | $0.005 | 5,000 | Multi-source deep research |
| `GET /health` | Free | 0 | Health check |

## Cost Comparison

| Provider | Standard Search | Deep/Pro Search | x402 Native | No Account |
|----------|----------------|-----------------|-------------|------------|
| **Queryx** | **$0.001** | **$0.005** | **Yes** | **Yes** |
| Perplexity API | $0.005 | $0.014 | No | No |
| Tavily | $0.004 | $0.008 | No | No |
| Brave Search API | $0.003 | N/A | No | No |

Queryx is **3-14x cheaper** than alternatives for standard search.

## Monthly Cost Estimates

### Standard Search (`/v1/search` at $0.001/query)

| Monthly Queries | Cost |
|----------------|------|
| 1,000 | $1.00 |
| 10,000 | $10.00 |
| 100,000 | $100.00 |

### News Search (`/v1/search/news` at $0.001/query)

| Monthly Queries | Cost |
|----------------|------|
| 1,000 | $1.00 |
| 10,000 | $10.00 |
| 100,000 | $100.00 |

### Deep Research (`/v1/search/deep` at $0.005/query)

| Monthly Queries | Cost |
|----------------|------|
| 1,000 | $5.00 |
| 10,000 | $50.00 |
| 100,000 | $500.00 |

### Blended Usage Example

A typical agent making 80% standard + 20% deep searches:

| Monthly Queries | Standard (80%) | Deep (20%) | Total Cost |
|----------------|----------------|------------|------------|
| 1,000 | 800 x $0.001 = $0.80 | 200 x $0.005 = $1.00 | **$1.80** |
| 10,000 | 8,000 x $0.001 = $8.00 | 2,000 x $0.005 = $10.00 | **$18.00** |
| 100,000 | 80,000 x $0.001 = $80.00 | 20,000 x $0.005 = $100.00 | **$180.00** |

## Payment Details

- **Network**: Base mainnet (Chain ID 8453)
- **Token**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **Protocol**: x402 (https://x402.org)
- **Settlement**: Instant, per-query
- **Minimum balance**: No minimum; pay exactly per query
