# Queryx Deployment Guide

This guide covers deploying Queryx to Railway with a single command.

## Prerequisites

- [Railway CLI](https://docs.railway.app/getting-started) installed
- Railway account
- Docker installed locally (for testing)

## Quick Deploy

### 1. Install Railway CLI

```bash
# Install via npm
npm install -g @railway/cli

# Or via brew
brew install railway
```

### 2. Login to Railway

```bash
railway login
```

This opens your browser to authenticate.

### 3. Initialize Project

```bash
cd queryx
railway init
```

Follow the prompts:
- Project name: `queryx`
- Select "Deploy from a Dockerfile"

### 4. Configure Environment Variables

Set required environment variables via Railway dashboard or CLI:

```bash
# Via CLI
railway variables set PAYMENTS_RECEIVABLE_ADDRESS=your_address
railway variables set FACILITATOR_URL=https://facilitator.daydreams.systems
railway variables set NETWORK=base
railway variables set BRAVE_API_KEY=your_brave_key
railway variables set OPENAI_API_KEY=your_openai_key
```

Or set them in the Railway dashboard under the project Settings > Variables.

### 5. Deploy

```bash
railway up
```

Your app will build via Dockerfile and deploy to Railway.

### 6. Verify Deployment

```bash
# Check status
railway status

# View logs
railway logs

# Test health endpoint
curl https://your-project-name.up.railway.app/health
```

## Custom Domain Setup

### 1. Add Custom Domain

```bash
railway domain add queryx.run
```

### 2. Configure DNS

Add a CNAME record pointing to your Railway app URL.

### 3. SSL

Railway automatically provisions SSL via Let's Encrypt.

## Local Development

### Build Docker Image Locally

```bash
docker build -t queryx .
docker run -p 3000:3000 queryx
```

### Run Smoke Test

```bash
./scripts/smoke-test.sh
```

## Troubleshooting

### Build Fails

- Ensure all required environment variables are set
- Check Dockerfile syntax
- Run `docker build` locally to debug

### Health Check Failing

- Verify PORT is set to 3000
- Check application logs: `railway logs`
- Ensure health endpoint exists at `/health`

### Deployment Issues

- Check Railway status page: https://status.railway.app
- Review deployment logs in Railway dashboard
