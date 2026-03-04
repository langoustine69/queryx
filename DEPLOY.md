# Railway Deployment Guide

## CLI Deployment

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Init in project root:
   ```bash
   railway init
   ```

4. Link to project (create new or select existing):
   ```bash
   railway link
   ```

5. Set variables from .env.example:
   ```bash
   railway variables set BRAVE_API_KEY=...
   ```

6. Deploy:
   ```bash
   railway up
   ```

## Dashboard Deployment

1. Go to https://railway.app/new
2. Connect GitHub repo langoustine69/queryx (approve access)
3. Select branch (main)
4. Railway auto-detects Dockerfile
5. Add service variables matching .env.example
6. Deploy

## Custom Domain

1. In Railway dashboard, go to Settings > Domains
2. Add custom domain (e.g. queryx.yourdomain.com)
3. Update DNS:
   - Type: CNAME
   - Name: queryx
   - Value: <railway-generated>.up.railway.app
4. SSL auto-provisions (5-10 min)

## Verify

```bash
curl https://your-railway-app.up.railway.app/health  # 200 OK
./scripts/smoke-test.sh  # All checks pass
```
