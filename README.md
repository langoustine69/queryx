# Queryx 🔍

> Agent-native search API. Pay per query in USDC via x402. No accounts. No subscriptions. Structured JSON.

**5-14x cheaper than Perplexity. Native x402 payments. Zero friction for agents.**

## Endpoints

| Endpoint | Price | Description |
|----------|-------|-------------|
| `GET /v1/search` | $0.001 | Web search + AI synthesis |
| `GET /v1/search/news` | $0.001 | News-focused, sorted by recency |
| `POST /v1/search/deep` | $0.005 | Multi-source deep research |
| `GET /health` | Free | Health check |

## Local Development

```bash
bun install
bun test
bun run typecheck
bun run dev
```

The server entrypoint exports `default { port, fetch }`, so Bun, Railway, and tests can mount the app without a manual `Bun.serve()` call.

## Environment

Copy `.env.example` and configure:

| Variable | Purpose |
|----------|---------|
| `PAYMENTS_RECEIVABLE_ADDRESS` | USDC receivable wallet for x402 payments on Base |
| `FACILITATOR_URL` | x402 facilitator URL |
| `NETWORK` | Payment network label, defaults to `base` for route challenges |
| `BRAVE_API_KEY` | Brave Search API key for live search |
| `OPENAI_API_KEY` | GPT-4o-mini synthesis key |
| `PORT` | Bun server port |
| `CACHE_TTL_SECONDS` | In-memory cache TTL |

## Payment Behavior

Paid endpoints return HTTP `402` with x402 payment details when no payment header is present. For contract tests only, `x402-test-payment: valid` bypasses settlement and uses deterministic fixture data.

## Quick Start (agent)

```bash
curl -H "PAYMENT-SIGNATURE: <x402-sig>" \
  "https://queryx.run/v1/search?q=Fed+rate+decision+impact+on+tech+stocks"
```

## Agent Discovery

- OpenAPI 3.1 spec: [`openapi.json`](openapi.json)
- Agent usage guide: [`docs/AGENT_GUIDE.md`](docs/AGENT_GUIDE.md)
- Pricing details: [`docs/PRICING.md`](docs/PRICING.md)
- xgate.run listing metadata: [`docs/XGATE_LISTING.md`](docs/XGATE_LISTING.md)

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
