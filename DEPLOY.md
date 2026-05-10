# Deploy Queryx on Railway

This guide deploys Queryx as a Bun service with Docker, Railway health checks, and GitHub Actions CI.

## Prerequisites

- Railway account and project access
- Railway CLI installed: `npm install -g @railway/cli`
- Brave Search API key
- OpenAI API key
- USDC receiving address for x402 challenge metadata

## Environment Variables

Create these variables in Railway under the service's Variables tab:

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | HTTP port used by Railway and Bun | `3000` |
| `BRAVE_API_KEY` | Brave Search API subscription token | `BSA...` |
| `OPENAI_API_KEY` | OpenAI API key used by the synthesis layer | `sk-...` |
| `CACHE_TTL_SECONDS` | In-memory cache duration for repeated queries | `300` |
| `X402_PAY_TO` | Production USDC receiving address | `0x...` |
| `X402_NETWORK` | Payment network advertised in 402 responses | `base` |
| `X402_ASSET` | Payment asset advertised in 402 responses | `USDC` |
| `QUERYX_BASE_URL` | Public service URL for smoke tests and docs | `https://queryx.run` |

Use `.env.example` as the local template. Do not commit real API keys or payment addresses.

## One-Command Railway Deployment

Log in and connect the repo:

```bash
railway login
railway init
```

Set variables in the Railway dashboard or with the CLI:

```bash
railway variables --set "BRAVE_API_KEY=..."
railway variables --set "OPENAI_API_KEY=..."
railway variables --set "X402_PAY_TO=0x..."
railway variables --set "X402_NETWORK=base"
railway variables --set "X402_ASSET=USDC"
railway variables --set "CACHE_TTL_SECONDS=300"
```

Deploy:

```bash
railway up
```

Railway uses `railway.json` to build with the Dockerfile and check `/health` before routing traffic.

## Custom Domain

In Railway, open the service, choose Settings, then Domains. Add `queryx.run`, copy the DNS record Railway provides, and configure that record with the domain registrar. After DNS propagates, set:

```bash
railway variables --set "QUERYX_BASE_URL=https://queryx.run"
```

## Local Verification

Install dependencies and run checks:

```bash
bun install
bun test
bun run tsc --noEmit
bun run start
```

In another terminal:

```bash
scripts/smoke-test.sh http://localhost:3000
```

Expected behavior:

- `GET /health` returns `{"status":"ok"}` with HTTP 200.
- Unpaid `GET /v1/search?q=railway` returns HTTP 402 with `x402-*` headers.
- Paid requests must include a payment signature header before Queryx calls Brave Search and OpenAI.
