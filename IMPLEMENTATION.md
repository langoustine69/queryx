=== FILE: openapi.json ===
{
  "openapi": "3.1.0",
  "info": {
    "title": "Queryx API",
    "version": "1.0.0",
    "description": "Queryx provides paid web search, news search, and deep research endpoints secured with x402 payment headers."
  },
  "servers": [
    {
      "url": "https://queryx.run",
      "description": "Production"
    }
  ],
  "tags": [
    {
      "name": "system",
      "description": "Service status endpoints"
    },
    {
      "name": "search",
      "description": "Web and news search endpoints"
    },
    {
      "name": "research",
      "description": "Multi-source deep research endpoint"
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "tags": [
          "system"
        ],
        "summary": "Health check",
        "operationId": "getHealth",
        "responses": {
          "200": {
            "description": "Service is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HealthResponse"
                },
                "examples": {
                  "ok": {
                    "value": {
                      "status": "ok",
                      "service": "queryx",
                      "version": "1.0.0",
                      "timestamp": "2026-03-04T12:00:00Z",
                      "uptime_seconds": 987654
                    }
                  }
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
          "search"
        ],
        "summary": "Search the web",
        "operationId": "searchWeb",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/QParam"
          },
          {
            "$ref": "#/components/parameters/LimitParam"
          },
          {
            "$ref": "#/components/parameters/LangParam"
          },
          {
            "$ref": "#/components/parameters/RegionParam"
          },
          {
            "$ref": "#/components/parameters/SafeSearchParam"
          },
          {
            "$ref": "#/components/parameters/IncludeAnswerParam"
          },
          {
            "$ref": "#/components/parameters/IncludeRawParam"
          },
          {
            "$ref": "#/components/parameters/XPaymentHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignatureHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddressHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Search results",
            "headers": {
              "X-RateLimit-Limit": {
                "$ref": "#/components/headers/XRateLimitLimit"
              },
              "X-RateLimit-Remaining": {
                "$ref": "#/components/headers/XRateLimitRemaining"
              },
              "X-RateLimit-Reset": {
                "$ref": "#/components/headers/XRateLimitReset"
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "examples": {
                  "default": {
                    "value": {
                      "request_id": "req_01JNSD8SDAXA3WB5S4J95A0QWF",
                      "query": "best vector database for rag",
                      "took_ms": 412,
                      "answer": "For most teams, PostgreSQL + pgvector or Qdrant are strong choices for RAG based on cost/performance and ecosystem.",
                      "results": [
                        {
                          "title": "Qdrant Documentation",
                          "url": "https://qdrant.tech/documentation/",
                          "snippet": "Qdrant is an open-source vector database and similarity search engine.",
                          "source": "qdrant.tech",
                          "score": 0.93,
                          "published_at": null
                        },
                        {
                          "title": "pgvector README",
                          "url": "https://github.com/pgvector/pgvector",
                          "snippet": "Open-source vector similarity search for Postgres.",
                          "source": "github.com",
                          "score": 0.9,
                          "published_at": null
                        }
                      ],
                      "usage": {
                        "endpoint": "/v1/search",
                        "billed_units": 1,
                        "price_usdc_base_units": "2500",
                        "price_usdc": "0.0025"
                      },
                      "payment": {
                        "payment_id": "pay_01JNSD8SP7RRA9TNDQXG1HVB7K",
                        "network": "base",
                        "asset": "USDC",
                        "amount_base_units": "2500",
                        "amount_usdc": "0.0025",
                        "facilitator": "0x0000000000000000000000000000000000000402",
                        "tx_hash": "0x3f84e5f80ba67f932fd91935f1f2f640ef0f69f6ab8da53f50dd6842e8f5bc61",
                        "settled_at": "2026-03-04T12:01:02Z"
                      }
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "422": {
            "$ref": "#/components/responses/ValidationError"
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
          "search"
        ],
        "summary": "Search recent news",
        "operationId": "searchNews",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/QParam"
          },
          {
            "$ref": "#/components/parameters/NewsLimitParam"
          },
          {
            "$ref": "#/components/parameters/LangParam"
          },
          {
            "$ref": "#/components/parameters/RegionParam"
          },
          {
            "$ref": "#/components/parameters/SinceParam"
          },
          {
            "$ref": "#/components/parameters/SortParam"
          },
          {
            "$ref": "#/components/parameters/XPaymentHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignatureHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddressHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "News search results",
            "headers": {
              "X-RateLimit-Limit": {
                "$ref": "#/components/headers/XRateLimitLimit"
              },
              "X-RateLimit-Remaining": {
                "$ref": "#/components/headers/XRateLimitRemaining"
              },
              "X-RateLimit-Reset": {
                "$ref": "#/components/headers/XRateLimitReset"
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NewsSearchResponse"
                },
                "examples": {
                  "default": {
                    "value": {
                      "request_id": "req_01JNSDAN1QY39WQ2S6P7JZG8KS",
                      "query": "base ecosystem funding round",
                      "took_ms": 528,
                      "results": [
                        {
                          "title": "New Base ecosystem startup raises seed round",
                          "url": "https://example.com/news/base-startup-seed-round",
                          "snippet": "A startup building on Base announced a new funding round led by...",
                          "source": "example.com",
                          "published_at": "2026-03-03T15:20:00Z"
                        },
                        {
                          "title": "VC activity grows on Base-aligned projects",
                          "url": "https://example.com/news/base-vc-activity",
                          "snippet": "Investors are increasing allocations to Base-native tooling...",
                          "source": "example.com",
                          "published_at": "2026-03-02T08:00:00Z"
                        }
                      ],
                      "usage": {
                        "endpoint": "/v1/search/news",
                        "billed_units": 1,
                        "price_usdc_base_units": "3000",
                        "price_usdc": "0.0030"
                      },
                      "payment": {
                        "payment_id": "pay_01JNSDAN8DZQW0D5M7G7E59BP9",
                        "network": "base",
                        "asset": "USDC",
                        "amount_base_units": "3000",
                        "amount_usdc": "0.0030",
                        "facilitator": "0x0000000000000000000000000000000000000402",
                        "tx_hash": "0x18806a8ef213813be9160ef8d53df8692d75af47ded9ad4ac07661808f020d33",
                        "settled_at": "2026-03-04T12:05:44Z"
                      }
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "422": {
            "$ref": "#/components/responses/ValidationError"
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
          "research"
        ],
        "summary": "Deep multi-source research",
        "operationId": "deepSearch",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/XPaymentHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignatureHeader"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddressHeader"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeepSearchRequest"
              },
              "examples": {
                "default": {
                  "value": {
                    "query": "Compare retrieval quality tradeoffs between BM25, dense vectors, and hybrid search for enterprise support docs.",
                    "depth": "deep",
                    "max_sources": 30,
                    "include_citations": true,
                    "include_snippets": true,
                    "time_range": {
                      "from": "2023-01-01T00:00:00Z",
                      "to": "2026-03-04T00:00:00Z"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Deep research result",
            "headers": {
              "X-RateLimit-Limit": {
                "$ref": "#/components/headers/XRateLimitLimit"
              },
              "X-RateLimit-Remaining": {
                "$ref": "#/components/headers/XRateLimitRemaining"
              },
              "X-RateLimit-Reset": {
                "$ref": "#/components/headers/XRateLimitReset"
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "examples": {
                  "default": {
                    "value": {
                      "request_id": "req_01JNSDGK2Y8NXM3XB95MG9Q1N4",
                      "query": "Compare retrieval quality tradeoffs between BM25, dense vectors, and hybrid search for enterprise support docs.",
                      "took_ms": 8242,
                      "summary": "Hybrid retrieval consistently improves recall for enterprise support corpora while preserving precision, especially when sparse lexical signals and dense semantic embeddings are both available.",
                      "findings": [
                        {
                          "statement": "BM25 excels on exact term matching and fresh keyword-heavy content.",
                          "confidence": 0.88,
                          "citation_ids": [
                            "c1",
                            "c3"
                          ]
                        },
                        {
                          "statement": "Dense retrieval improves semantic recall for paraphrased user questions.",
                          "confidence": 0.91,
                          "citation_ids": [
                            "c2",
                            "c4"
                          ]
                        },
                        {
                          "statement": "Hybrid rank fusion generally outperforms either method in isolation on support QA benchmarks.",
                          "confidence": 0.93,
                          "citation_ids": [
                            "c1",
                            "c2",
                            "c5"
                          ]
                        }
                      ],
                      "citations": [
                        {
                          "id": "c1",
                          "title": "Benchmarking hybrid retrieval for enterprise QA",
                          "url": "https://example.com/research/hybrid-retrieval-benchmark",
                          "excerpt": "Hybrid models improved nDCG@10 across 8 out of 9 datasets.",
                          "published_at": "2025-11-02T10:00:00Z"
                        },
                        {
                          "id": "c2",
                          "title": "Dense vs sparse retrieval in customer support",
                          "url": "https://example.com/research/dense-vs-sparse-support",
                          "excerpt": "Dense methods recovered semantically related tickets missed by BM25.",
                          "published_at": "2025-08-14T09:15:00Z"
                        }
                      ],
                      "usage": {
                        "endpoint": "/v1/search/deep",
                        "billed_units": 1,
                        "price_usdc_base_units": "15000",
                        "price_usdc": "0.0150"
                      },
                      "payment": {
                        "payment_id": "pay_01JNSDGK8A3DBS9VVT4E16D8AJ",
                        "network": "base",
                        "asset": "USDC",
                        "amount_base_units": "15000",
                        "amount_usdc": "0.0150",
                        "facilitator": "0x0000000000000000000000000000000000000402",
                        "tx_hash": "0xfc8f9db4fc6b1f68bc6eec80a0f40dbfb22f4c83883be3c38f11f8e9c2ea6d83",
                        "settled_at": "2026-03-04T12:10:11Z"
                      }
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequired"
          },
          "422": {
            "$ref": "#/components/responses/ValidationError"
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
        "description": "x402 payment envelope. Send together with X-Payment-Signature and X-Payment-Address."
      }
    },
    "parameters": {
      "QParam": {
        "name": "q",
        "in": "query",
        "required": true,
        "description": "Search query string.",
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 512
        },
        "examples": {
          "default": {
            "value": "latest updates on retrieval augmented generation"
          }
        }
      },
      "LimitParam": {
        "name": "limit",
        "in": "query",
        "required": false,
        "description": "Maximum number of web results.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 20,
          "default": 10
        },
        "examples": {
          "default": {
            "value": 10
          }
        }
      },
      "NewsLimitParam": {
        "name": "limit",
        "in": "query",
        "required": false,
        "description": "Maximum number of news results.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 10
        }
      },
      "LangParam": {
        "name": "lang",
        "in": "query",
        "required": false,
        "description": "Language hint (BCP-47 style, e.g. en or en-US).",
        "schema": {
          "type": "string",
          "minLength": 2,
          "maxLength": 10,
          "default": "en"
        }
      },
      "RegionParam": {
        "name": "region",
        "in": "query",
        "required": false,
        "description": "Regional market hint (e.g. US, EU).",
        "schema": {
          "type": "string",
          "minLength": 2,
          "maxLength": 16
        }
      },
      "SafeSearchParam": {
        "name": "safe_search",
        "in": "query",
        "required": false,
        "description": "Safe search level.",
        "schema": {
          "type": "string",
          "enum": [
            "off",
            "moderate",
            "strict"
          ],
          "default": "moderate"
        }
      },
      "IncludeAnswerParam": {
        "name": "include_answer",
        "in": "query",
        "required": false,
        "description": "Whether to include generated answer text.",
        "schema": {
          "type": "boolean",
          "default": true
        }
      },
      "IncludeRawParam": {
        "name": "include_raw",
        "in": "query",
        "required": false,
        "description": "Whether to include raw provider metadata (if available).",
        "schema": {
          "type": "boolean",
          "default": false
        }
      },
      "SinceParam": {
        "name": "since",
        "in": "query",
        "required": false,
        "description": "Only include news newer than this timestamp.",
        "schema": {
          "type": "string",
          "format": "date-time"
        }
      },
      "SortParam": {
        "name": "sort",
        "in": "query",
        "required": false,
        "description": "Sort strategy for news results.",
        "schema": {
          "type": "string",
          "enum": [
            "relevance",
            "date"
          ],
          "default": "relevance"
        }
      },
      "XPaymentHeader": {
        "name": "X-Payment",
        "in": "header",
        "required": false,
        "description": "Base64-encoded JSON payment envelope returned by a prior 402 response.",
        "schema": {
          "type": "string",
          "minLength": 1
        }
      },
      "XPaymentSignatureHeader": {
        "name": "X-Payment-Signature",
        "in": "header",
        "required": false,
        "description": "Wallet signature for the x402 signing payload.",
        "schema": {
          "type": "string",
          "minLength": 1
        }
      },
      "XPaymentAddressHeader": {
        "name": "X-Payment-Address",
        "in": "header",
        "required": false,
        "description": "Hex wallet address used to sign the payment payload.",
        "schema": {
          "type": "string",
          "pattern": "^0x[a-fA-F0-9]{40}$"
        }
      }
    },
    "headers": {
      "XRateLimitLimit": {
        "description": "Requests allowed in the current window.",
        "schema": {
          "type": "integer"
        }
      },
      "XRateLimitRemaining": {
        "description": "Remaining requests in the current window.",
        "schema": {
          "type": "integer"
        }
      },
      "XRateLimitReset": {
        "description": "Unix timestamp when the current rate-limit window resets.",
        "schema": {
          "type": "integer"
        }
      }
    },
    "responses": {
      "PaymentRequired": {
        "description": "Payment required; sign payload and retry with x402 headers.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/PaymentRequiredErrorResponse"
            },
            "examples": {
              "payment_required": {
                "value": {
                  "request_id": "req_01JNSDRR2J5ATV5SWH5SDSV6P8",
                  "timestamp": "2026-03-04T12:12:00Z",
                  "error": {
                    "code": "payment_required",
                    "message": "This endpoint requires x402 payment."
                  },
                  "payment_requirement": {
                    "scheme": "x402",
                    "network": "base",
                    "asset": "USDC",
                    "asset_address": "0x833589fCD6EDB6E08f4c7C32D4f71b54bdA02913",
                    "amount_base_units": "2500",
                    "amount_usdc": "0.0025",
                    "facilitator": "0x0000000000000000000000000000000000000402",
                    "payment_id": "pay_01JNSDRR5E6H0E9RWRP50WKTNE",
                    "expires_at": "2026-03-04T12:14:00Z",
                    "nonce": "ea5f22f8-f31f-4231-909a-dc68f1a1f31d",
                    "signature": {
                      "algorithm": "eip191",
                      "payload": "x402|pay_01JNSDRR5E6H0E9RWRP50WKTNE|2500|USDC|base|2026-03-04T12:14:00Z|ea5f22f8-f31f-4231-909a-dc68f1a1f31d",
                      "typed_data": null
                    }
                  }
                }
              }
            }
          }
        }
      },
      "ValidationError": {
        "description": "Request validation failed",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ValidationErrorResponse"
            },
            "examples": {
              "invalid_query": {
                "value": {
                  "request_id": "req_01JNSDSW2G0H4R6P2G7HP4AWDZ",
                  "timestamp": "2026-03-04T12:13:01Z",
                  "error": {
                    "code": "validation_error",
                    "message": "Invalid request parameters.",
                    "fields": [
                      {
                        "field": "q",
                        "message": "q is required."
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "RateLimitExceeded": {
        "description": "Too many requests",
        "headers": {
          "Retry-After": {
            "description": "Seconds before retrying.",
            "schema": {
              "type": "integer"
            }
          },
          "X-RateLimit-Limit": {
            "$ref": "#/components/headers/XRateLimitLimit"
          },
          "X-RateLimit-Remaining": {
            "$ref": "#/components/headers/XRateLimitRemaining"
          },
          "X-RateLimit-Reset": {
            "$ref": "#/components/headers/XRateLimitReset"
          }
        },
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/RateLimitErrorResponse"
            },
            "examples": {
              "rate_limited": {
                "value": {
                  "request_id": "req_01JNSDTQWPVTT0Q8TQ3M8EJY50",
                  "timestamp": "2026-03-04T12:14:21Z",
                  "error": {
                    "code": "rate_limited",
                    "message": "Rate limit exceeded.",
                    "retry_after_seconds": 8
                  }
                }
              }
            }
          }
        }
      },
      "InternalServerError": {
        "description": "Unexpected server-side error",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/InternalErrorResponse"
            },
            "examples": {
              "internal_error": {
                "value": {
                  "request_id": "req_01JNSDV4A74SKKBFA3QYQJ4FMP",
                  "timestamp": "2026-03-04T12:15:05Z",
                  "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred."
                  }
                }
              }
            }
          }
        }
      }
    },
    "schemas": {
      "HealthResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "status",
          "service",
          "version",
          "timestamp",
          "uptime_seconds"
        ],
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "ok"
            ]
          },
          "service": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "uptime_seconds": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "SearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "query",
          "took_ms",
          "results",
          "usage",
          "payment"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "query": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "answer": {
            "type": [
              "string",
              "null"
            ]
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SearchResult"
            }
          },
          "usage": {
            "$ref": "#/components/schemas/Usage"
          },
          "payment": {
            "$ref": "#/components/schemas/PaymentReceipt"
          }
        }
      },
      "SearchResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "title",
          "url",
          "snippet",
          "source",
          "score"
        ],
        "properties": {
          "title": {
            "type": "string"
          },
          "url": {
            "type": "string",
            "format": "uri"
          },
          "snippet": {
            "type": "string"
          },
          "source": {
            "type": "string"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "published_at": {
            "type": [
              "string",
              "null"
            ],
            "format": "date-time"
          }
        }
      },
      "NewsSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "query",
          "took_ms",
          "results",
          "usage",
          "payment"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "query": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NewsResult"
            }
          },
          "usage": {
            "$ref": "#/components/schemas/Usage"
          },
          "payment": {
            "$ref": "#/components/schemas/PaymentReceipt"
          }
        }
      },
      "NewsResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "title",
          "url",
          "snippet",
          "source",
          "published_at"
        ],
        "properties": {
          "title": {
            "type": "string"
          },
          "url": {
            "type": "string",
            "format": "uri"
          },
          "snippet": {
            "type": "string"
          },
          "source": {
            "type": "string"
          },
          "published_at": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "DeepSearchRequest": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "query"
        ],
        "properties": {
          "query": {
            "