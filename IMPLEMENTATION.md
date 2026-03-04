=== FILE: openapi.json ===
{
  "openapi": "3.1.0",
  "info": {
    "title": "Queryx API",
    "summary": "x402-native web search, news search, and deep research API",
    "description": "Queryx exposes paid search endpoints secured with x402 payment envelopes over Base USDC. Clients send an X-PAYMENT header for paid endpoints.",
    "version": "1.0.0",
    "contact": {
      "name": "Queryx",
      "url": "https://github.com/langoustine69/queryx"
    }
  },
  "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
  "servers": [
    {
      "url": "https://queryx.run",
      "description": "Production"
    }
  ],
  "tags": [
    {
      "name": "health",
      "description": "Service health and readiness"
    },
    {
      "name": "search",
      "description": "Web and news search endpoints"
    },
    {
      "name": "deep-search",
      "description": "Deep research endpoint with synthesized answer and citations"
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
          "health"
        ],
        "operationId": "getHealth",
        "summary": "Health check",
        "description": "Returns service health, version, and uptime. This endpoint is free and does not require x402 payment.",
        "security": [],
        "responses": {
          "200": {
            "description": "Service is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HealthResponse"
                },
                "examples": {
                  "healthy": {
                    "value": {
                      "status": "ok",
                      "service": "queryx",
                      "version": "1.0.0",
                      "timestamp": "2026-03-04T12:00:00Z",
                      "uptime_seconds": 86422
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
        "operationId": "searchWeb",
        "summary": "Web search",
        "description": "Performs ranked web search for the provided query.",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "Search query string.",
            "schema": {
              "type": "string",
              "minLength": 1,
              "maxLength": 512
            },
            "example": "latest llm evaluation benchmarks"
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Maximum number of results to return.",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 20,
              "default": 10
            },
            "example": 10
          },
          {
            "name": "offset",
            "in": "query",
            "required": false,
            "description": "Pagination offset.",
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0
            },
            "example": 0
          },
          {
            "name": "country",
            "in": "query",
            "required": false,
            "description": "Optional ISO 3166-1 alpha-2 country filter.",
            "schema": {
              "type": "string",
              "pattern": "^[A-Z]{2}$"
            },
            "example": "US"
          },
          {
            "name": "lang",
            "in": "query",
            "required": false,
            "description": "Optional ISO 639-1 language code filter.",
            "schema": {
              "type": "string",
              "pattern": "^[a-z]{2}$"
            },
            "example": "en"
          },
          {
            "name": "freshness",
            "in": "query",
            "required": false,
            "description": "Time-based freshness filter.",
            "schema": {
              "type": "string",
              "enum": [
                "any",
                "day",
                "week",
                "month"
              ],
              "default": "any"
            },
            "example": "week"
          },
          {
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
            },
            "example": "moderate"
          }
        ],
        "responses": {
          "200": {
            "description": "Search results",
            "headers": {
              "X-Request-Id": {
                "description": "Unique request id for tracing.",
                "schema": {
                  "type": "string"
                }
              },
              "X-Billed-Units": {
                "description": "Amount charged in USDC base units (6 decimals).",
                "schema": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "examples": {
                  "webSearch": {
                    "value": {
                      "query": "latest llm evaluation benchmarks",
                      "count": 2,
                      "results": [
                        {
                          "title": "State of LLM Evaluation 2026",
                          "url": "https://queryx.run/mock/state-of-llm-eval-2026",
                          "snippet": "A survey of modern benchmark design, contamination checks, and robustness criteria.",
                          "source": "queryx.run",
                          "rank": 1,
                          "score": 0.96,
                          "published_at": "2026-02-26T09:20:00Z",
                          "favicon_url": "https://queryx.run/mock/favicon.png"
                        },
                        {
                          "title": "Benchmark Drift in Agentic Systems",
                          "url": "https://queryx.run/mock/benchmark-drift-agentic-systems",
                          "snippet": "How long-lived systems overfit public test sets and how to detect it.",
                          "source": "queryx.run",
                          "rank": 2,
                          "score": 0.89,
                          "published_at": "2026-02-24T14:02:00Z",
                          "favicon_url": null
                        }
                      ],
                      "meta": {
                        "request_id": "req_01JNR9C4SE8X0F09M4PEKQ6W22",
                        "took_ms": 132,
                        "billed_units": 1000,
                        "billed_usdc": "0.001",
                        "limit": 10,
                        "offset": 0
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
            "$ref": "#/components/responses/TooManyRequests"
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
        "operationId": "searchNews",
        "summary": "News search",
        "description": "Searches indexed news sources and returns ranked articles.",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "News query string.",
            "schema": {
              "type": "string",
              "minLength": 1,
              "maxLength": 512
            },
            "example": "agentic browser updates"
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Maximum number of articles to return.",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 50,
              "default": 10
            },
            "example": 10
          },
          {
            "name": "offset",
            "in": "query",
            "required": false,
            "description": "Pagination offset.",
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0
            },
            "example": 0
          },
          {
            "name": "country",
            "in": "query",
            "required": false,
            "description": "Optional ISO 3166-1 alpha-2 country filter.",
            "schema": {
              "type": "string",
              "pattern": "^[A-Z]{2}$"
            },
            "example": "US"
          },
          {
            "name": "lang",
            "in": "query",
            "required": false,
            "description": "Optional ISO 639-1 language code filter.",
            "schema": {
              "type": "string",
              "pattern": "^[a-z]{2}$"
            },
            "example": "en"
          },
          {
            "name": "from",
            "in": "query",
            "required": false,
            "description": "Inclusive lower bound for publication time.",
            "schema": {
              "type": "string",
              "format": "date-time"
            },
            "example": "2026-03-01T00:00:00Z"
          },
          {
            "name": "to",
            "in": "query",
            "required": false,
            "description": "Inclusive upper bound for publication time.",
            "schema": {
              "type": "string",
              "format": "date-time"
            },
            "example": "2026-03-04T23:59:59Z"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "description": "Sort strategy for news ranking.",
            "schema": {
              "type": "string",
              "enum": [
                "relevance",
                "latest"
              ],
              "default": "relevance"
            },
            "example": "latest"
          }
        ],
        "responses": {
          "200": {
            "description": "News search results",
            "headers": {
              "X-Request-Id": {
                "description": "Unique request id for tracing.",
                "schema": {
                  "type": "string"
                }
              },
              "X-Billed-Units": {
                "description": "Amount charged in USDC base units (6 decimals).",
                "schema": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NewsSearchResponse"
                },
                "examples": {
                  "newsSearch": {
                    "value": {
                      "query": "agentic browser updates",
                      "count": 2,
                      "results": [
                        {
                          "title": "Agentic Browser Capabilities Expand in 2026",
                          "url": "https://queryx.run/mock/agentic-browser-capabilities-2026",
                          "snippet": "Vendors shipped stronger tool-use APIs and safer autonomous browsing defaults.",
                          "publisher": "queryx.run",
                          "section": "technology",
                          "rank": 1,
                          "score": 0.93,
                          "published_at": "2026-03-03T10:30:00Z",
                          "image_url": "https://queryx.run/mock/news-image-1.jpg"
                        },
                        {
                          "title": "Research Teams Standardize Web Task Evaluation",
                          "url": "https://queryx.run/mock/web-task-evaluation-standardization",
                          "snippet": "A consortium proposed reproducible metrics for web-native agent benchmarks.",
                          "publisher": "queryx.run",
                          "section": "research",
                          "rank": 2,
                          "score": 0.88,
                          "published_at": "2026-03-02T17:05:00Z",
                          "image_url": null
                        }
                      ],
                      "meta": {
                        "request_id": "req_01JNR9Y1T8E9W3Y8FCNR0R6Q8A",
                        "took_ms": 155,
                        "billed_units": 1500,
                        "billed_usdc": "0.0015",
                        "limit": 10,
                        "offset": 0,
                        "sort": "latest"
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
            "$ref": "#/components/responses/TooManyRequests"
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
          "deep-search"
        ],
        "operationId": "searchDeep",
        "summary": "Deep research search",
        "description": "Runs multi-step retrieval and synthesis to produce a grounded answer with citations.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeepSearchRequest"
              },
              "examples": {
                "deepRequest": {
                  "value": {
                    "query": "What changed in retrieval augmented generation best practices in 2025?",
                    "analysis_depth": "deep",
                    "max_sources": 10,
                    "recency": "30d",
                    "answer_format": "markdown",
                    "need_citations": true,
                    "include_domains": [
                      "queryx.run"
                    ],
                    "exclude_domains": [],
                    "user_context": "Prioritize reproducibility and evaluation quality."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Deep search answer with citations",
            "headers": {
              "X-Request-Id": {
                "description": "Unique request id for tracing.",
                "schema": {
                  "type": "string"
                }
              },
              "X-Billed-Units": {
                "description": "Amount charged in USDC base units (6 decimals).",
                "schema": {
                  "type": "integer",
                  "minimum": 0
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "examples": {
                  "deepResponse": {
                    "value": {
                      "query": "What changed in retrieval augmented generation best practices in 2025?",
                      "answer": "In 2025, teams shifted from single-pass retrieval to iterative retrieval loops with explicit verification. Common upgrades included dynamic chunk sizing, citation-level confidence scoring, and benchmark contamination audits before release.",
                      "highlights": [
                        "Iterative retrieval replaced single-pass retrieval in most production systems.",
                        "Citation confidence became a first-class output field.",
                        "Evaluation shifted toward out-of-distribution and contamination-aware tests."
                      ],
                      "citations": [
                        {
                          "id": "src_1",
                          "title": "RAG Systems Report 2025",
                          "url": "https://queryx.run/mock/rag-systems-report-2025",
                          "snippet": "Iterative retrieval and verifier loops improved factual precision across long-form tasks.",
                          "relevance": 0.95
                        },
                        {
                          "id": "src_2",
                          "title": "Benchmark Hygiene for Retrieval Pipelines",
                          "url": "https://queryx.run/mock/benchmark-hygiene-retrieval",
                          "snippet": "Contamination checks are now standard for public benchmark publication.",
                          "relevance": 0.91
                        }
                      ],
                      "meta": {
                        "request_id": "req_01JNRB79QGQK7N7WS8Z3S5FW31",
                        "took_ms": 1840,
                        "billed_units": 5000,
                        "billed_usdc": "0.005",
                        "sources_considered": 22,
                        "sources_used": 6,
                        "analysis_depth": "deep"
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
            "$ref": "#/components/responses/TooManyRequests"
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
        "name": "X-PAYMENT",
        "description": "x402 payment envelope encoded as base64url JSON. Required on paid endpoints.",
        "x-x402": {
          "version": "x402-1",
          "network": "base",
          "asset": "USDC",
          "facilitator": "0x4E3b7E2c9C22f8f3A7fA9E6eD9Bd4F2c2A11bC09",
          "pricing_base_units": {
            "GET /v1/search": 1000,
            "GET /v1/search/news": 1500,
            "POST /v1/search/deep": 5000
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
            "type": "string",
            "example": "queryx"
          },
          "version": {
            "type": "string",
            "example": "1.0.0"
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
      "SearchResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "title",
          "url",
          "snippet",
          "source",
          "rank",
          "score",
          "published_at",
          "favicon_url"
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
          "rank": {
            "type": "integer",
            "minimum": 1
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
          },
          "favicon_url": {
            "type": [
              "string",
              "null"
            ],
            "format": "uri"
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
          "publisher",
          "section",
          "rank",
          "score",
          "published_at",
          "image_url"
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
          "publisher": {
            "type": "string"
          },
          "section": {
            "type": [
              "string",
              "null"
            ]
          },
          "rank": {
            "type": "integer",
            "minimum": 1
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "published_at": {
            "type": "string",
            "format": "date-time"
          },
          "image_url": {
            "type": [
              "string",
              "null"
            ],
            "format": "uri"
          }
        }
      },
      "SearchMeta": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "took_ms",
          "billed_units",
          "billed_usdc",
          "limit",
          "offset"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "billed_units": {
            "type": "integer",
            "minimum": 0
          },
          "billed_usdc": {
            "type": "string",
            "pattern": "^(0|[1-9]\\d*)(\\.\\d{1,6})?$"
          },
          "limit": {
            "type": "integer",
            "minimum": 1
          },
          "offset": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "NewsSearchMeta": {
        "allOf": [
          {
            "$ref": "#/components/schemas/SearchMeta"
          },
          {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "sort"
            ],
            "properties": {
              "sort": {
                "type": "string",
                "enum": [
                  "relevance",
                  "latest"
                ]
              }
            }
          }
        ]
      },
      "DeepSearchMeta": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "took_ms",
          "billed_units",
          "billed_usdc",
          "sources_considered",
          "sources_used",
          "analysis_depth"
        ],
        "properties": {
          "request_id": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "billed_units": {
            "type": "integer",
            "minimum": 0
          },
          "billed_usdc": {
            "type": "string",
            "pattern": "^(0|[1-9]\\d*)(\\.\\d{1,6})?$"
          },
          "sources_considered": {
            "type": "integer",
            "minimum": 0
          },
          "sources_used": {
            "type": "integer",
            "minimum": 0
          },
          "analysis_depth": {
            "type": "string",
            "enum": [
              "standard",
              "deep"
            ]
          }
        }
      },
      "SearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "query",
          "count",
          "results",
          "meta"
        ],
        "properties": {
          "query": {
            "type": "string"
          },
          "count": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SearchResult"
            }
          },
          "meta": {
            "$ref": "#/components/schemas/SearchMeta"
          }
        }
      },
      "NewsSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "query",
          "count",
          "results",
          "meta"
        ],
        "properties": {
          "query": {
            "type": "string"
          },
          "count": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NewsResult"
            }
          },
          "meta": {
            "$ref": "#/components/schemas/NewsSearchMeta"
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
            "type": "string",
            "minLength": 1,
            "maxLength": 2048
          },
          "analysis_depth": {
            "type": "string",
            "enum": [
              "standard",
              "deep"
            ],
            "default": "standard"
          },
          "max_sources": {
            "type": "integer",
            "minimum": 1,
            "maximum": 25,
            "default": 8
          },
          "include_domains": {
            "type": "array",
            "maxItems": 20,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "default": []
          },
          "exclude_domains": {
            "type": "array",
            "maxItems": 20,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "default": []
          },
          "recency": {
            "type": "string",
            "enum": [
              "any",
              "24h",
              "7d",
              "30d"
            ],
            "default": "any"
          },
          "answer_format": {
            "type": "string",
            "enum": [
              "markdown",
              "text",
              "json"
            ],
            "default": "markdown"
          },
          "need_citations": {
            "type": "boolean",
            "default": true
          },
          "user_context": {
            "type": "string",
            "maxLength": 4000
          }
        }
      },
      "DeepCitation": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "url",
          "snippet",
          "relevance"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
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
          "relevance": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "DeepSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "query",
          "answer",
          "highlights",
          "citations",
          "meta"
        ],
        "properties": {
          "query": {
            "type": "string"
          },
          "answer": {
            "type": "string"
          },
          "highlights": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "citations": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/DeepCitation"
            }
          },
          "meta": {
            "$ref": "#/components/schemas/DeepSearchMeta"
          }
        }
      },
      "ErrorObject": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "code",
          "message"
        ],
        "properties": {
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      },
      "PaymentRequirement": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "network",
          "asset",
          "amount",
          "facilitator",
          "payment_header",
          "resource",
          "expires_at"
        ],
        "properties": {
          "network": {
            "type": "string",
            "example": "base"
          },
          "asset": {
            "type": "string",
            "example": "USDC"
          },
          "amount": {
            "type": "string",
            "pattern": "^[0-9]+$",
            "description": "USDC base units (6 decimals)."
          },
          "facilitator": {
            "type": "string",
            "pattern": "^0x[a-fA-F0-9]{40}$"
          },
          "payment_header": {
            "type": "string",
            "example": "X-PAYMENT"
          },
          "resource": {
            "type": "string",
            "example": "GET:/v1/search"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "PaymentRequiredResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error",
          "request_id",
          "payment"
        ],
        "properties": {
          "error": {
            "$ref": "#/components/schemas/ErrorObject"
          },
          "request_id": {
            "type": "string"
          },
          "payment": {
            "$ref": "#/components/schemas/PaymentRequirement"
          }
        }
      },
      "ValidationIssue": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "field",
          "message"
        ],
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      },
      "ValidationErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error",
          "request_id",
          "issues"
        ],
        "properties": {
          "error": {
            "$ref": "#/components/schemas/ErrorObject"
          },
          "request_id": {
            "type": "string"
          },
          "issues": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/ValidationIssue"
            }
          }
        }
      },
      "RateLimitErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error",
          "request_id",
          "retry_after_seconds"
        ],
        "properties": {
          "error": {
            "$ref": "#/components/schemas/ErrorObject"
          },
          "request_id": {
            "type": "string"
          },
          "retry_after_seconds": {
            "type": "integer",
            "minimum": 1
          }
        }
      },
      "InternalErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error",
          "request_id"
        ],
        "properties": {
          "error": {
            "$ref": "#/components/schemas/ErrorObject"
          },
          "request_id": {
            "type": "string"
          }
        }
      },
      "PaymentEnvelope": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "version",
          "network",
          "asset",
          "amount",
          "resource",
          "nonce",
          "timestamp",
          "payer",
          "signature"
        ],
        "properties": {
          "version": {
            "type": "string",
            "example": "