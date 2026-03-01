# Deploying Queryx to Railway

## Prerequisites

- [Railway account](https://railway.app)
- [Railway CLI](https://docs.railway.app/develop/cli) installed
- [Bun](https://bun.sh) installed locally
- A Brave Search API key from [brave.com/search/api](https://brave.com/search/api/)

## Step 1 — Install Railway CLI

```bash
npm install -g @railway/cli
# or
brew install railway
```

## Step 2 — Login

```bash
railway login
```

This opens a browser window for OAuth. Complete login, then return to your terminal.

## Step 3 — Link or initialise project

If this is a **new** project:

```bash
railway init
```

If the Railway project already exists:

```bash
railway link
```

Select your team/workspace and the `queryx` project when prompted.

## Step 4 — Set environment variables

Set all required env vars via the Railway dashboard **or** the CLI:

```bash
railway variables set BRAVE_API_KEY=your_brave_key_here
railway variables set PORT=3000
railway variables set NODE_ENV=production
# Add any additional vars listed in .env.example
```

> ⚠️  Never commit real secrets. Only `.env.example` (with placeholder values) is committed to git.

## Step 5 — Deploy

```bash
railway up
```

Railway will build the Dockerfile, run the health check at `/health`, and promote the deployment once it passes.

To tail logs during deploy:

```bash
railway logs
```

## Step 6 — Verify health check

Once the deployment shows **Active**, confirm the service is healthy:

```bash
curl -f https://your-service.up.railway.app/health
# Expected: {"ok":true}
```

## Step 7 — Custom domain (`queryx.run`)

1. Open the Railway dashboard → your service → **Settings** → **Domains**.
2. Click **Add Custom Domain** and enter `queryx.run` (and `www.queryx.run` if desired).
3. Railway will display the DNS records to add at your registrar:
   - `CNAME queryx.run → <railway-provided-target>`
4. Wait for DNS propagation (usually < 5 minutes with Railway's verification).
5. Railway automatically provisions and renews the TLS certificate.

## CI/CD (GitHub Actions)

The `.github/workflows/ci.yml` pipeline:

- **On every PR**: runs `bun test` and `tsc --noEmit` — deploy is **skipped**.
- **On merge to `main`**: runs tests, then calls `railway up --detach` automatically.

To enable the auto-deploy step, add your Railway token as a GitHub secret:

1. Railway dashboard → **Account Settings** → **Tokens** → **Create Token**.
2. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
3. Name: `RAILWAY_TOKEN`, value: the token from step 1.

## Smoke test

After any deploy you can run the included smoke test:

```bash
bash scripts/smoke-test.sh https://your-service.up.railway.app
```

See `scripts/smoke-test.sh` for details on what is verified.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Health check fails | Check `railway logs`; ensure `BRAVE_API_KEY` is set and the app binds to `PORT` |
| `railway up` 401 error | Re-run `railway login` or regenerate `RAILWAY_TOKEN` |
| DNS not resolving | Verify CNAME record at registrar; allow up to 24 h for full propagation |
| Build fails on `bun install` | Ensure `bun.lockb` is committed and matches `package.json` |
