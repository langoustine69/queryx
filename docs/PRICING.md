# Queryx Pricing

## Per-Query Costs

| Endpoint | Cost (USDC) | Cost (USD) |
|----------|-------------|------------|
| `/v1/search` | 0.001 | $0.001 |
| `/v1/search/news` | 0.001 | $0.001 |
| `/v1/search/deep` | 0.005 | $0.005 |
| `/health` | Free | Free |

All payments are in USDC on Base Mainnet via the x402 protocol.

## Monthly Cost Estimates

| Monthly Queries | Search Only | Deep Only | Mixed (80/20) |
|-----------------|-------------|-----------|----------------|
| 1,000 | $1.00 | $5.00 | $1.80 |
| 10,000 | $10.00 | $50.00 | $18.00 |
| 100,000 | $100.00 | $500.00 | $180.00 |

*Mixed assumes 80% standard search, 20% deep research.*

## Comparison

| Provider | Search Cost | Includes AI Synthesis | Payment |
|----------|-----------|----------------------|---------|
| **Queryx** | $0.001/query | ✅ | USDC (x402) |
| Perplexity API | $0.005/query | ✅ | Credit card |
| Tavily | $0.001/query | Partial | Credit card |
| Brave Search API | Free tier / $0.003 | ❌ | Credit card |
| SerpAPI | $0.0125/query | ❌ | Credit card |

### Why Queryx?

- **No signup** — pay with USDC, no API key management
- **Agent-native** — designed for AI agent consumption
- **Transparent** — pay exactly per query, no subscriptions
- **Decentralized payments** — x402 on Base, no intermediary

## Facilitator

All payments are validated through the x402 facilitator:
- **URL:** `https://facilitator.daydreams.systems`
- **Network:** Base Mainnet
- **Currency:** USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
