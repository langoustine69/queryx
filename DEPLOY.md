# Deploying Queryx to Railway

Step-by-step guide to deploy Queryx from zero.

## Prerequisites

- [Railway account](https://railway.app)
- [Railway CLI](https://docs.railway.app/guides/cli) installed
- A Brave Search API key ([get one](https://brave.com/search/api/))
- An OpenAI API key
- A Base wallet address for receiving USDC payments

## 1. Install Railway CLI

```bash
# macOS / Linux
npm install -g @railway/cli

# Or via Homebrew
brew install railway
```

## 2. Login

```bash
railway login
```

This opens a browser window for authentication.

## 3. Initialize Project

From the repo root:

```bash
railway init
```

Select "Empty Project" when prompted. This links your local directory to a new Railway project.

## 4. Set Environment Variables

Via the Railway dashboard (recommended for secrets):

1. Go to your project at [railway.app](https://railway.app)
2. Click your service → **Variables** tab
3. Add all variables from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYMENTS_RECEIVABLE_ADDRESS` | ✅ | Your Base wallet address for USDC |
| `FACILITATOR_URL` | ✅ | `https://facilitator.daydreams.systems` |
| `NETWORK` | ✅ | `base` |
| `BRAVE_API_KEY` | ✅ | Brave Search API key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `PORT` | ❌ | Railway sets this automatically |
| `CACHE_TTL_SECONDS` | ❌ | Default: `300` |

Or via CLI:

```bash
railway variables set PAYMENTS_RECEIVABLE_ADDRESS=0xYourAddress
railway variables set FACILITATOR_URL=https://facilitator.daydreams.systems
railway variables set NETWORK=base
railway variables set BRAVE_API_KEY=BSA-xxxxxxxxxxxx
railway variables set OPENAI_API_KEY=sk-xxxxxxxxxxxx
```

## 5. Deploy

```bash
railway up
```

Railway will:
1. Detect the `Dockerfile` (configured in `railway.json`)
2. Build the container
3. Deploy and start the service
4. Run health checks against `/health`

First deploy typically takes 1-2 minutes.

## 6. Verify Deployment

Get your deployment URL:

```bash
railway open
```

Test the health endpoint:

```bash
curl https://your-service.up.railway.app/health
# Expected: {"status":"ok"}
```

Run the smoke test:

```bash
./scripts/smoke-test.sh https://your-service.up.railway.app
```

## 7. Custom Domain Setup (`queryx.run`)

1. In Railway dashboard → your service → **Settings** → **Networking**
2. Click **Custom Domain** → enter `queryx.run`
3. Railway provides DNS records (typically a CNAME)
4. At your domain registrar, add:
   - `CNAME` record: `queryx.run` → `<railway-provided-target>`
   - Or for apex domain: use an `ALIAS`/`ANAME` record if supported
5. Wait for DNS propagation (usually < 10 minutes)
6. Railway auto-provisions TLS via Let's Encrypt

## Redeployment

Push to `main` (with CI configured) or manually:

```bash
railway up
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check `bun.lock` is committed; run `bun install` locally first |
| Health check fails | Ensure `PORT` env var isn't hardcoded; Railway injects it |
| 402 on all routes | This is expected — x402 payment required. Use smoke test to verify |
| Container OOM | Increase RAM in Railway service settings (default 512MB is fine) |

## Logs

```bash
railway logs
```

Or view in real-time via the Railway dashboard.
