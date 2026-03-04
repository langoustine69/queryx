# Railway Deployment

## CLI
1. `npm i -g @railway/cli`
2. `railway login`
3. `git clone https://github.com/langoustine69/queryx`
4. `cd queryx`
5. `railway init` (create/link project)
6. Add vars: `railway variables set BRAVE_API_KEY=... OPENAI_API_KEY=...`
7. `railway up`

## Dashboard
1. railway.app/dashboard → New Project → GitHub → langoustine69/queryx
2. Settings → Variables → Add BRAVE_API_KEY, OPENAI_API_KEY
3. Deploys automatically on push

## Custom Domain
1. Project Settings → Domains
2. + New Domain → yourdomain.com
3. Update DNS (CNAME railway.app link)