# Railway Deployment

## Prerequisites

- Railway account
- Railway CLI
- Brave Search API key
- OpenAI API key
- Base Mainnet USDC receiving address

## Local check

```bash
bun install
bun test
bun run typecheck
bun run src/index.ts
curl http://localhost:3000/health
```

## Deploy

```bash
npm install -g @railway/cli
railway login
railway init
railway variables set BRAVE_API_KEY=your_brave_search_api_key
railway variables set OPENAI_API_KEY=your_openai_api_key
railway variables set X402_NETWORK=base-mainnet
railway variables set X402_ASSET=USDC
railway variables set X402_RECEIVER=0x0000000000000000000000000000000000000000
railway variables set QUERYX_PRICE_SEARCH=0.001
railway variables set QUERYX_PRICE_DEEP=0.005
railway up
```

## Health check

Railway uses `/health` as the deployment health check. A healthy deployment returns:

```json
{ "status": "ok" }
```

## Custom domain

1. Open the Railway project dashboard.
2. Go to Settings, then Domains.
3. Add `queryx.run`.
4. Add the DNS record Railway provides.
5. Wait for Railway to issue TLS.

## Smoke test

```bash
scripts/smoke-test.sh https://queryx.run
```
