# Deploying Queryx on Railway

## Prerequisites
- [Railway CLI](https://docs.railway.app/guides/cli) installed
- A Railway account
- Environment variables ready (see `.env.example`)

## Quick Deploy

### 1. Login & Init
```bash
railway login
railway init        # creates a new project
railway link        # or link to existing project
```

### 2. Set Environment Variables
Via Railway dashboard → your project → Variables tab, set:

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYMENTS_RECEIVABLE_ADDRESS` | ✅ | USDC wallet on Base |
| `FACILITATOR_URL` | ✅ | `https://facilitator.daydreams.systems` |
| `NETWORK` | ✅ | `base` |
| `BRAVE_API_KEY` | ✅ | Brave Search API key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `PORT` | ❌ | Auto-set by Railway |
| `CACHE_TTL_SECONDS` | ❌ | Default: 300 |

Or via CLI:
```bash
railway variables set BRAVE_API_KEY=your_key
railway variables set OPENAI_API_KEY=your_key
railway variables set PAYMENTS_RECEIVABLE_ADDRESS=0x...
railway variables set FACILITATOR_URL=https://facilitator.daydreams.systems
railway variables set NETWORK=base
```

### 3. Deploy
```bash
railway up
```

Railway auto-detects the `Dockerfile` and builds.

### 4. Custom Domain (Optional)
1. Railway dashboard → Settings → Domains
2. Add custom domain: `queryx.run`
3. Add CNAME record pointing to Railway's domain
4. Wait for SSL provisioning (~2 min)

### 5. Verify
```bash
# Health check
curl https://your-app.up.railway.app/health

# Should return 402 (no payment)
curl https://your-app.up.railway.app/v1/search?q=test

# Run smoke test
./scripts/smoke-test.sh https://your-app.up.railway.app
```

## Local Docker Test
```bash
docker build -t queryx .
docker run -p 3000:3000 --env-file .env queryx
curl http://localhost:3000/health
```

## CI
GitHub Actions runs on every push to `main` and on PRs. See `.github/workflows/ci.yml`.
