# Queryx 🔍 [![CI](https://github.com/langoustine69/queryx/workflows/CI/badge.svg)](https://github.com/langoustine69/queryx/actions)

&gt; Agent-native search API. Pay per query in USDC via x402. No accounts. No subscriptions. Structured JSON.

**5-14x cheaper than Perplexity. Native x402 payments. Zero friction for agents.**

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /v1/search` | $0.001 | Web search + AI synthesis |
| `GET /v1/search/news` | $0.001 | News-focused, sorted by recency |
| `POST /v1/search/deep` | $0.005 | Multi-source deep research |
| `GET /health` | Free | Health check |

## Quick Start (agent)

```bash
curl -H &quot;PAYMENT-SIGNATURE: &lt;x402-sig&gt;&quot; \
  &quot;https://queryx.run/v1/search?q=Fed+rate+decision+impact+on+tech+stocks&quot;
```

## Stack

- [Lucid Agents SDK](https://github.com/daydreamsai/lucid-agents) — x402 payments, identity
- [Brave Search API](https://brave.com/search/api/) — web results
- GPT-4o-mini — synthesis
- Railway — hosting
- Base Mainnet — USDC payments

## Competitive Positioning

| | Perplexity | Tavily | **Queryx** |
|--|--|--|--|
| Price/query | $0.005–0.014 | $0.004 | **$0.001** |
| x402 native | ❌ | ❌ | ✅ |
| No account needed | ❌ | ❌ | ✅ |
| Agent JSON output | ❌ | ✅ | ✅ |

## License

MIT
