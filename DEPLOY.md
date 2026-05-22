# Railway Deployment

This guide deploys Queryx to Railway with the Dockerfile in this repository.

## Prerequisites

- A Railway account
- Railway CLI installed
- Required provider keys from `.env.example`

## Steps

1. Install and authenticate the Railway CLI:

   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. Create or link a Railway project:

   ```bash
   railway init
   ```

3. Add the required environment variables in the Railway dashboard:

   - `BRAVE_API_KEY`
   - `OPENAI_API_KEY`
   - `CACHE_TTL_SECONDS`
   - `X402_NETWORK`
   - `X402_RECIPIENT_ADDRESS`

   Railway provides `PORT` automatically, so it is optional in production.

4. Deploy:

   ```bash
   railway up
   ```

5. Configure a custom domain:

   - Open the Railway service settings.
   - Add `queryx.run` under Networking.
   - Point your DNS record to the Railway-provided target.

6. Verify the deployment:

   ```bash
   bash scripts/smoke-test.sh https://queryx.run
   ```

## Health Check

Railway uses `/health` as configured in `railway.json`. A healthy service returns:

```json
{ "status": "ok" }
```
