![CI](https://github.com/langoustine69/queryx/actions/workflows/ci.yml/badge.svg)

# Deploying queryx to Railway

## Prerequisites

- [Railway account](https://railway.app/) (free tier works)
- [Railway CLI](https://docs.railway.app/develop/cli) installed: `npm install -g @railway/cli`
- [Docker](https://www.docker.com/) installed (for local testing)
- `BRAVE_API_KEY` from [Brave Search API](https://api.search.brave.com/)
- `OPENAI_API_KEY` from [OpenAI Platform](https://platform.openai.com/)

---

## Option A: Railway CLI Deployment

```bash
# 1. Log in to Railway
railway login

# 2. Create a new Railway project
railway new

# 3. Link to the project (if already created)
railway link

# 4. Set required environment variables
railway variables set BRAVE_API_KEY=your_brave_api_key_here
railway variables set OPENAI_API_KEY=your_openai_api_key_here

# Optional variables
railway variables set CACHE_TTL_SECONDS=300
railway variables set PORT=3000

# 5. Deploy
railway up
```

---

## Option B: Dashboard Deployment

1. Go to [railway.app](https://railway.app/) and create a new project.
2. Click **New Service** and choose **GitHub Repo**.
3. Connect your GitHub account and select the `queryx` repository.
4. Railway will auto-detect the `Dockerfile` and use it for builds.
5. Navigate to the **Variables** tab in your service settings.
6. Add the following environment variables:

   | Variable | Required | Description |
   |---|---|---|
   | `BRAVE_API_KEY` | Yes | Brave Search API key |
   | `OPENAI_API_KEY` | Yes | OpenAI API key |
   | `CACHE_TTL_SECONDS` | No (default: 300) | Cache TTL in seconds |
   | `PORT` | No (default: 3000) | Server port |

7. Click **Deploy** — Railway will build the Docker image and deploy it.

---

## Custom Domain Setup

1. In the Railway dashboard, go to your service settings.
2. Click **Settings** > **Networking** > **Custom Domain**.
3. Enter your domain name and follow the DNS configuration instructions.
4. Railway provides a CNAME record to add to your DNS provider.
5. Once DNS propagates, your service will be accessible at your custom domain.

---

## Health Check Verification

After deployment, verify the service is healthy:

```bash
# Replace with your Railway app URL
curl https://your-app.railway.app/health
```

Expected response:

```json
{"status":"ok"}
```

A successful response confirms the service is running correctly.

---

## Rollback

To roll back to a previous deployment:

```bash
# List recent deployments
railway deployments

# Roll back to the previous deployment
railway rollback
```

Or roll back from the Railway dashboard by clicking **Deployments** and selecting a previous deploy.

---

## Local Docker Test

Test your Docker build locally before deploying:

```bash
# Copy the example env file and fill in your values
cp .env.example .env
# Edit .env with your actual API keys

# Build the Docker image
docker build -t queryx .

# Run the container
docker run -p 3000:3000 --env-file .env queryx

# Verify locally
curl http://localhost:3000/health
```

---

## Smoke Test

Run the included smoke test script against any deployment:

```bash
# Test local instance
bash scripts/smoke-test.sh http://localhost:3000

# Test production
bash scripts/smoke-test.sh https://your-app.railway.app
```
