=== FILE: openapi.json ===
{
  "openapi": "3.1.0",
  "info": {
    "title": "Queryx API",
    "version": "1.0.0",
    "description": "Queryx is an x402-paid search API on Base. This spec covers web search, news search, deep research, and health endpoints."
  },
  "servers": [
    {
      "url": "https://queryx.run",
      "description": "Production"
    }
  ],
  "tags": [
    {
      "name": "System",
      "description": "Service status and health operations."
    },
    {
      "name": "Search",
      "description": "Paid search and research endpoints secured by x402."
    }
  ],
  "security": [
    {
      "x402": []
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "tags": [
          "System"
        ],
        "summary": "Health check",
        "description": "Returns service liveness and basic runtime metadata.",
        "operationId": "getHealth",
        "security": [],
        "responses": {
          "200": {
            "description": "Service is healthy.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HealthResponse"
                },
                "example": {
                  "status": "ok",
                  "service": "queryx",
                  "version": "1.0.0",
                  "timestamp": "2026-03-04T12:00:00Z",
                  "uptime_seconds": 86423
                }
              }
            }
          },
          "500": {
            "$ref": "#/components/responses/InternalServerError"
          }
        }
      }
    },
    "/v1/search": {
      "get": {
        "tags": [
          "Search"
        ],
        "summary": "Web search",
        "description": "Search the web and optionally return a concise synthesized answer with citations.",
        "operationId": "searchWeb",
        "security": [
          {
            "x402": []
          }
        ],
        "x-pricing": {
          "asset": "USDC",
          "chain": "base",
          "cost_base_units": 1000,
          "cost_usdc": "0.001"
        },
        "parameters": [
          {
            "$ref": "#/components/parameters/XPaymentHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignatureHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentTimestampHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddressHeader"
          },
          {
            "$ref": "#/components/parameters/QueryParam"
          },
          {
            "$ref": "#/components/parameters/CountryParam"
          },
          {
            "$ref": "#/components/parameters/LanguageParam"
          },
          {
            "$ref": "#/components/parameters/FreshnessParam"
          },
          {
            "$ref": "#/components/parameters/LimitParam"
          },
          {
            "$ref": "#/components/parameters/PageParam"
          },
          {
            "$ref": "#/components/parameters/IncludeAnswerParam"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful web search response.",
            "headers": {
              "X-RateLimit-Limit": {
                "$ref": "#/components/headers/RateLimitLimitHeader"
              },
              "X-RateLimit-Remaining": {
                "$ref": "#/components/headers/RateLimitRemainingHeader"
              },
              "X-RateLimit-Reset": {
                "$ref": "#/components/headers/RateLimitResetHeader"
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "example": {
                  "object": "search.result",
                  "id": "srch_01HQX4AHQ3W3H8W9CC61J0M2VE",
                  "query": "latest base network ecosystem updates",
                  "answer": "Base ecosystem activity continues to grow, with tooling and agent integrations expanding in early 2026.",
                  "results": [
                    {
                      "position": 1,
                      "title": "Queryx",
                      "url": "https://queryx.run",
                      "snippet": "x402-paid search API on Base for web, news, and deep research.",
                      "source": "queryx",
                      "relevance": 0.98,
                      "published_at": "2026-03-02T16:00:00Z"
                    },
                    {
                      "position": 2,
                      "title": "Queryx health endpoint",
                      "url": "https://queryx.run",
                      "snippet": "Use /health to verify service status before issuing paid calls.",
                      "source": "queryx",
                      "relevance": 0.77,
                      "published_at": null
                    }
                  ],
                  "citations": [
                    {
                      "index": 1,
                      "title": "Queryx",
                      "url": "https://queryx.run"
                    }
                  ],
                  "usage": {
                    "endpoint": "/v1/search",
                    "query_units": 1,
                    "cost_base_units": 1000,
                    "cost_usdc": "0.001",
                    "latency_ms": 241,
                    "rate_limit_remaining": 119,
                    "request_id": "req_01HQX4AHZ4A3H9N81YE60P5N0R"
                  },
                  "generated_at": "2026-03-04T12:00:01Z"
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "422": {
            "$ref": "#/components/responses/ValidationFailed"
          },
          "429": {
            "$ref": "#/components/responses/RateLimitExceeded"
          },
          "500": {
            "$ref": "#/components/responses/InternalServerError"
          }
        }
      }
    },
    "/v1/search/news": {
      "get": {
        "tags": [
          "Search"
        ],
        "summary": "News search",
        "description": "Search current news articles with publication metadata.",
        "operationId": "searchNews",
        "security": [
          {
            "x402": []
          }
        ],
        "x-pricing": {
          "asset": "USDC",
          "chain": "base",
          "cost_base_units": 2000,
          "cost_usdc": "0.002"
        },
        "parameters": [
          {
            "$ref": "#/components/parameters/XPaymentHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignatureHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentTimestampHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddressHeader"
          },
          {
            "$ref": "#/components/parameters/QueryParam"
          },
          {
            "$ref": "#/components/parameters/TopicParam"
          },
          {
            "$ref": "#/components/parameters/LanguageParam"
          },
          {
            "$ref": "#/components/parameters/CountryParam"
          },
          {
            "$ref": "#/components/parameters/FromDateParam"
          },
          {
            "$ref": "#/components/parameters/ToDateParam"
          },
          {
            "$ref": "#/components/parameters/SortParam"
          },
          {
            "$ref": "#/components/parameters/LimitParam"
          },
          {
            "$ref": "#/components/parameters/PageParam"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful news search response.",
            "headers": {
              "X-RateLimit-Limit": {
                "$ref": "#/components/headers/RateLimitLimitHeader"
              },
              "X-RateLimit-Remaining": {
                "$ref": "#/components/headers/RateLimitRemainingHeader"
              },
              "X-RateLimit-Reset": {
                "$ref": "#/components/headers/RateLimitResetHeader"
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NewsSearchResponse"
                },
                "example": {
                  "object": "news.search.result",
                  "id": "news_01HQX4B04TRT1P9CFQJFKM1D8B",
                  "query": "agent infrastructure",
                  "clusters": 3,
                  "results": [
                    {
                      "position": 1,
                      "title": "Queryx ships OpenAPI docs",
                      "url": "https://queryx.run",
                      "snippet": "The Queryx API now includes a complete OpenAPI 3.1 specification.",
                      "publisher": "Queryx",
                      "published_at": "2026-03-04T08:20:00Z",
                      "category": "technology",
                      "image_url": null
                    }
                  ],
                  "usage": {
                    "endpoint": "/v1/search/news",
                    "query_units": 1,
                    "cost_base_units": 2000,
                    "cost_usdc": "0.002",
                    "latency_ms": 319,
                    "rate_limit_remaining": 89,
                    "request_id": "req_01HQX4B09QH6WJXRW7EGWQ4W0N"
                  },
                  "generated_at": "2026-03-04T12:00:02Z"
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "422": {
            "$ref": "#/components/responses/ValidationFailed"
          },
          "429": {
            "$ref": "#/components/responses/RateLimitExceeded"
          },
          "500": {
            "$ref": "#/components/responses/InternalServerError"
          }
        }
      }
    },
    "/v1/search/deep": {
      "post": {
        "tags": [
          "Search"
        ],
        "summary": "Deep research search",
        "description": "Run a multi-source deep research workflow and return structured sections, supporting evidence, and takeaways.",
        "operationId": "deepSearch",
        "security": [
          {
            "x402": []
          }
        ],
        "x-pricing": {
          "asset": "USDC",
          "chain": "base",
          "cost_base_units": 15000,
          "cost_usdc": "0.015"
        },
        "parameters": [
          {
            "$ref": "#/components/parameters/XPaymentHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignatureHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentTimestampHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddressHeader"
          },
          {
            "$ref": "#/components/parameters/IdempotencyKeyHeader"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeepSearchRequest"
              },
              "example": {
                "query": "What are the primary trade-offs between web-scale retrieval quality and response latency?",
                "depth": "standard",
                "max_sources": 25,
                "include_raw_content": false,
                "freshness": "month"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful deep research response.",
            "headers": {
              "X-RateLimit-Limit": {
                "$ref": "#/components/headers/RateLimitLimitHeader"
              },
              "X-RateLimit-Remaining": {
                "$ref": "#/components/headers/RateLimitRemainingHeader"
              },
              "X-RateLimit-Reset": {
                "$ref": "#/components/headers/RateLimitResetHeader"
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "example": {
                  "object": "deep.search.result",
                  "id": "deep_01HQX4B3AV4EV8A9J3PDQARQ6N",
                  "query": "What are the primary trade-offs between web-scale retrieval quality and response latency?",
                  "executive_summary": "Higher retrieval quality usually requires broader candidate generation and heavier reranking, increasing latency and cost. Practical systems tune these with adaptive depth and caching.",
                  "sections": [
                    {
                      "heading": "Latency vs relevance",
                      "summary": "Increasing candidate set size improves recall but can slow response time without tiered ranking.",
                      "evidence": [
                        {
                          "claim": "Two-stage retrieval commonly balances quality and speed.",
                          "source_index": 1,
                          "confidence": 0.89
                        }
                      ]
                    }
                  ],
                  "sources": [
                    {
                      "index": 1,
                      "title": "Queryx",
                      "url": "https://queryx.run",
                      "snippet": "Queryx deep search endpoint for structured research output.",
                      "domain": "queryx.run",
                      "published_at": "2026-03-01T00:00:00Z",
                      "raw_content": null
                    }
                  ],
                  "takeaways": [
                    "Use adaptive depth to reduce tail latency.",
                    "Cache stable sources and summaries.",
                    "Reserve comprehensive mode for high-value prompts."
                  ],
                  "usage": {
                    "endpoint": "/v1/search/deep",
                    "query_units": 1,
                    "cost_base_units": 15000,
                    "cost_usdc": "0.015",
                    "latency_ms": 1429,
                    "rate_limit_remaining": 29,
                    "request_id": "req_01HQX4B3CZ8WQ1SHX2R7XJ3A21"
                  },
                  "generated_at": "2026-03-04T12:00:03Z"
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "422": {
            "$ref": "#/components/responses/ValidationFailed"
          },
          "429": {
            "$ref": "#/components/responses/RateLimitExceeded"
          },
          "500": {
            "$ref": "#/components/responses/InternalServerError"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "x402": {
        "type": "apiKey",
        "in": "header",
        "name": "X-Payment",
        "description": "x402 payment payload (base64-encoded JSON). Also send X-Payment-Signature, X-Payment-Timestamp, and X-Payment-Address headers.",
        "x-x402": {
          "chain": "base",
          "chain_id": 8453,
          "asset": "USDC",
          "facilitator_address": "0x9a2fE0f2f5f4A8E4f6D8dD68fAecbf3A4aB1aE52"
        }
      }
    },
    "parameters": {
      "XPaymentHeader": {
        "name": "X-Payment",
        "in": "header",
        "required": false,
        "description": "Base64-encoded x402 payment payload JSON. Required on paid requests after receiving a 