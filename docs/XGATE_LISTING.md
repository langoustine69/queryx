# xgate.run Listing Metadata

Use this copy when submitting Queryx to the xgate.run bazaar.

## Name

Queryx

## Short Description

Agent-native x402 search API for web, news, and deep research.

## Long Description

Queryx gives agents paid, accountless search over HTTP. Agents receive an x402 payment challenge, settle in USDC, and retry the same request to get structured JSON with a synthesized answer, source links, freshness metadata, confidence, model ID, and token usage.

## Category

Search

## Tags

```text
x402, search, news, research, agents, usdc, base, openapi
```

## Production URL

```text
https://queryx.run
```

## OpenAPI URL

```text
https://queryx.run/openapi.json
```

If the deployment does not serve the file directly yet, use the repository copy:

```text
https://github.com/langoustine69/queryx/blob/main/openapi.json
```

## Pricing

- `GET /v1/search`: `0.001` USDC
- `GET /v1/search/news`: `0.001` USDC
- `POST /v1/search/deep`: `0.005` USDC

## Health Check

```text
GET /health
```

Expected response:

```json
{ "status": "ok" }
```

