# Queryx Pricing

Queryx charges per request using x402 USDC payments.

## Endpoint Prices

| Endpoint | Method | Price (USDC) | Base units, 6 decimals | Intended use |
| --- | --- | ---: | ---: | --- |
| `/v1/search` | `GET` | `0.001` | `1000` | Web search and synthesis |
| `/v1/search/news` | `GET` | `0.001` | `1000` | Recent news search |
| `/v1/search/deep` | `POST` | `0.005` | `5000` | Deeper multi-source research |
| `/health` | `GET` | `0` | `0` | Health checks |

## Payment Network

Default network: `base`

Default facilitator:

```text
https://facilitator.daydreams.systems
```

The payment receiver is configured by `PAYMENTS_RECEIVABLE_ADDRESS`.

## Cost Comparison

| Provider | Typical agent-search price | Account required | Native x402 | Structured JSON |
| --- | ---: | --- | --- | --- |
| Queryx web/news | `0.001` USDC | No | Yes | Yes |
| Queryx deep | `0.005` USDC | No | Yes | Yes |
| Tavily | Around `$0.004` per search credit | Yes | No | Yes |
| Perplexity Sonar | Around `$0.005` to `$0.014` per request class | Yes | No | Yes |
| Brave Search API | Plan-dependent | Yes | No | Source results only |

## Agent Budgeting Examples

| Workload | Endpoint mix | Estimated cost |
| --- | --- | ---: |
| 100 general searches | 100 x `/v1/search` | `0.100` USDC |
| 100 news checks | 100 x `/v1/search/news` | `0.100` USDC |
| 20 research tasks | 20 x `/v1/search/deep` | `0.100` USDC |
| Mixed daily monitor | 80 web + 20 news + 5 deep | `0.125` USDC |

## Notes For Agents

- Always read the live `402` challenge before paying. It is the source of truth for price, network, receiver, and facilitator.
- Prices in this document are the intended defaults; deployments can override receiver and network configuration.
- If a request fails before settlement, do not assume a charge occurred. Use the facilitator response and wallet transaction state as the payment record.

