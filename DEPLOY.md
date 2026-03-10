# QueryX Deployment Guide

## Prerequisites

- [Railway](https://railway.app) account
- [Railway CLI](https://docs.railway.app/guides/cli) installed
- Brave Search API key
- OpenAI API key

## Step 1: Install Railway CLI

```bash
# Install via npm
npm install -g @railway/cli

# Or via brew
brew install railway
```

## Step 2: Login to Railway

```bash
railway login
```

## Step 3: Initialize Project

```bash
# Navigate to your project directory
cd queryx

# Initialize Railway project
railway init

# Follow the prompts to create a new project
```

## Step 4: Configure Environment Variables

Set the required environment variables via the Railway dashboard:

1. Go to your project on [Railway Dashboard](https://railway.dashboard)
2. Click on the environment (e.g., "production")
3. Click "Variables" tab
4. Add the following variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `BRAVE_API_KEY` | Brave Search API key | Yes |
| `OPENAI_API_KEY` | OpenAI API key for synthesis | Yes |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds (default: 300) | No |
| `PORT` | Server port (default: 3000) | No |

## Step 5: Deploy

```bash
railway up
```

The deployment will:
1. Build the Docker container
2. Start the server on port 3000
3. Run health checks on `/health`

## Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://your-project-name.up.railway.app/health

# Should return: { "status": "ok" }
```

## Step 7: Custom Domain Setup (Optional)

1. Go to your project settings on Railway
2. Click "Domains"
3. Click "Generate Domain" for Railway-provided domain
4. Or add custom domain (e.g., `queryx.run`)

## Troubleshooting

### Health check fails
- Ensure `PORT` is set to `3000`
- Check logs: `railway logs`

### API errors
- Verify `BRAVE_API_KEY` is valid
- Verify `OPENAI_API_KEY` has credits

### Rate limiting
- Reduce `CACHE_TTL_SECONDS` for shorter cache
- Check Brave API rate limits
