=== FILE: openapi.json ===
{
  "openapi": "3.1.0",
  "info": {
    "title": "Queryx API",
    "version": "1.0.0",
    "summary": "Paid web, news, and deep research search API using x402 micropayments.",
    "description": "Queryx provides high-quality search and research endpoints with per-request x402 payment on Base (USDC)."
  },
  "servers": [
    {
      "url": "https://queryx.run",
      "description": "Production"
    }
  ],
  "tags": [
    {
      "name": "Search",
      "description": "Web and news search endpoints."
    },
    {
      "name": "Deep Research",
      "description": "Higher-cost endpoint for synthesized research answers with citations."
    },
    {
      "name": "Health",
      "description": "Service health and readiness."
    }
  ],
  "paths": {
    "/v1/search": {
      "get": {
        "tags": [
          "Search"
        ],
        "operationId": "searchWeb",
        "summary": "Search the web",
        "description": "Returns ranked web search results for a query. Requires x402 payment via X-PAYMENT header.",
        "security": [
          {
            "x402": []
          }
        ],
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
            "example": "base chain x402 micropayments"
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Number of results to return.",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 20,
              "default": 10
            },
            "example": 5
          },
          {
            "name": "include_domains",
            "in": "query",
            "required": false,
            "description": "Comma-separated domains to include.",
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "maxItems": 20
            },
            "style": "form",
            "explode": false,
            "example": "queryx.run"
          },
          {
            "name": "exclude_domains",
            "in": "query",
            "required": false,
            "description": "Comma-separated domains to exclude.",
            "schema": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "maxItems": 20
            },
            "style": "form",
            "explode": false,
            "example": "ads.queryx.run"
          },
          {
            "name": "hl",
            "in": "query",
            "required": false,
            "description": "Language code.",
            "schema": {
              "type": "string",
              "minLength": 2,
              "maxLength": 10,
              "default": "en"
            },
            "example": "en"
          },
          {
            "name": "gl",
            "in": "query",
            "required": false,
            "description": "Geographic region code.",
            "schema": {
              "type": "string",
              "minLength": 2,
              "maxLength": 2
            },
            "example": "US"
          },
          {
            "name": "freshness",
            "in": "query",
            "required": false,
            "description": "Time filter for indexed documents.",
            "schema": {
              "type": "string",
              "enum": [
                "day",
                "week",
                "month",
                "year",
                "anytime"
              ],
              "default": "anytime"
            },
            "example": "month"
          },
          {
            "name": "safe_search",
            "in": "query",
            "required": false,
            "description": "Safe-search policy.",
            "schema": {
              "type": "string",
              "enum": [
                "strict",
                "moderate",
                "off"
              ],
              "default": "moderate"
            },
            "example": "moderate"
          }
        ],
        "responses": {
          "200": {
            "description": "Search results.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "examples": {
                  "success": {
                    "summary": "Web search success",
                    "value": {
                      "query": "base chain x402 micropayments",
                      "request_id": "req_01HTZ6Q2X7R7N0G9QWR5Q0Y6EA",
                      "took_ms": 182,
                      "total_results": 12840,
                      "results": [
                        {
                          "title": "Queryx x402 overview",
                          "url": "https://queryx.run/content/x402-overview",
                          "snippet": "Queryx supports x402 payment for metered API access over Base USDC.",
                          "source": "queryx.run",
                          "score": 0.98,
                          "published_at": "2026-02-28T18:05:10Z"
                        },
                        {
                          "title": "Building paid agents with Queryx",
                          "url": "https://queryx.run/content/paid-agents",
                          "snippet": "Agent-ready examples for paid search with deterministic retries.",
                          "source": "queryx.run",
                          "score": 0.93,
                          "published_at": "2026-02-20T11:40:55Z"
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/Error402"
          },
          "422": {
            "$ref": "#/components/responses/Error422"
          },
          "429": {
            "$ref": "#/components/responses/Error429"
          },
          "500": {
            "$ref": "#/components/responses/Error500"
          }
        },
        "x-codeSamples": [
          {
            "lang": "bash",
            "label": "cURL",
            "source": "curl -sS -G 'https://queryx.run/v1/search' \\\n  --data-urlencode 'q=base chain x402 micropayments' \\\n  --data-urlencode 'limit=5' \\\n  -H 'X-PAYMENT: <base64url-payment-envelope>'"
          }
        ]
      }
    },
    "/v1/search/news": {
      "get": {
        "tags": [
          "Search"
        ],
        "operationId": "searchNews",
        "summary": "Search recent news",
        "description": "Returns ranked and time-aware news results. Requires x402 payment via X-PAYMENT header.",
        "security": [
          {
            "x402": []
          }
        ],
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
            "example": "base ecosystem funding"
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Number of news articles to return.",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 50,
              "default": 10
            },
            "example": 10
          },
          {
            "name": "from",
            "in": "query",
            "required": false,
            "description": "Lower bound publication date (inclusive, ISO 8601 date).",
            "schema": {
              "type": "string",
              "format": "date"
            },
            "example": "2026-02-01"
          },
          {
            "name": "to",
            "in": "query",
            "required": false,
            "description": "Upper bound publication date (inclusive, ISO 8601 date).",
            "schema": {
              "type": "string",
              "format": "date"
            },
            "example": "2026-03-04"
          },
          {
            "name": "hl",
            "in": "query",
            "required": false,
            "description": "Language code.",
            "schema": {
              "type": "string",
              "minLength": 2,
              "maxLength": 10,
              "default": "en"
            },
            "example": "en"
          },
          {
            "name": "gl",
            "in": "query",
            "required": false,
            "description": "Geographic region code.",
            "schema": {
              "type": "string",
              "minLength": 2,
              "maxLength": 2
            },
            "example": "US"
          }
        ],
        "responses": {
          "200": {
            "description": "News search results.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NewsSearchResponse"
                },
                "examples": {
                  "success": {
                    "summary": "News search success",
                    "value": {
                      "query": "base ecosystem funding",
                      "request_id": "req_01HTZ7C9F6Y5M3E1X0M4KJ7W91",
                      "took_ms": 204,
                      "total_results": 187,
                      "results": [
                        {
                          "title": "Ecosystem grant expansion announced",
                          "url": "https://queryx.run/content/news/ecosystem-grants",
                          "snippet": "New grants target developer tooling and AI agents.",
                          "source": "queryx.run",
                          "publisher": "Queryx Newsroom",
                          "score": 0.95,
                          "published_at": "2026-03-03T14:10:00Z"
                        },
                        {
                          "title": "Onchain payments for API access keep growing",
                          "url": "https://queryx.run/content/news/onchain-api-payments",
                          "snippet": "x402 usage expands across search and data APIs.",
                          "source": "queryx.run",
                          "publisher": "Queryx Newsroom",
                          "score": 0.91,
                          "published_at": "2026-03-02T09:00:00Z"
                        }
                      ]
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/Error402"
          },
          "422": {
            "$ref": "#/components/responses/Error422"
          },
          "429": {
            "$ref": "#/components/responses/Error429"
          },
          "500": {
            "$ref": "#/components/responses/Error500"
          }
        },
        "x-codeSamples": [
          {
            "lang": "bash",
            "label": "cURL",
            "source": "curl -sS -G 'https://queryx.run/v1/search/news' \\\n  --data-urlencode 'q=base ecosystem funding' \\\n  --data-urlencode 'limit=10' \\\n  -H 'X-PAYMENT: <base64url-payment-envelope>'"
          }
        ]
      }
    },
    "/v1/search/deep": {
      "post": {
        "tags": [
          "Deep Research"
        ],
        "operationId": "searchDeep",
        "summary": "Deep research query with synthesized answer",
        "description": "Performs multi-source retrieval and synthesis with citations. Higher cost than standard search. Requires x402 payment via X-PAYMENT header.",
        "security": [
          {
            "x402": []
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
                  "summary": "Deep query request",
                  "value": {
                    "query": "What changed in x402 payment adoption over the last 6 months?",
                    "objective": "Summarize key trends, include concrete adoption signals and likely implications for agent builders.",
                    "max_sources": 10,
                    "include_domains": [
                      "queryx.run"
                    ],
                    "exclude_domains": [],
                    "recency": "year",
                    "output_format": "markdown"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Synthesized deep-research response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "examples": {
                  "success": {
                    "summary": "Deep research success",
                    "value": {
                      "query": "What changed in x402 payment adoption over the last 6 months?",
                      "request_id": "req_01HTZ8JQNX7Q2S2N9A6M8K7BXR",
                      "took_ms": 2950,
                      "summary": "x402 adoption accelerated as API providers shifted from subscriptions to per-call micropayments. Growth concentrated in search and data APIs where deterministic unit pricing is important for autonomous agents.",
                      "key_findings": [
                        "Micropayment acceptance broadened among API-first products.",
                        "USDC settlement on Base reduced payment friction for agent workflows.",
                        "402-first retry logic became standard in SDK patterns."
                      ],
                      "citations": [
                        {
                          "title": "Queryx x402 overview",
                          "url": "https://queryx.run/content/x402-overview",
                          "snippet": "Protocol and payment envelope details.",
                          "source": "queryx.run",
                          "relevance": 0.97
                        },
                        {
                          "title": "Building paid agents with Queryx",
                          "url": "https://queryx.run/content/paid-agents",
                          "snippet": "Implementation patterns and retry flow.",
                          "source": "queryx.run",
                          "relevance": 0.92
                        }
                      ],
                      "sources_searched": 10,
                      "model": "queryx-deep-v1"
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/Error402"
          },
          "422": {
            "$ref": "#/components/responses/Error422"
          },
          "429": {
            "$ref": "#/components/responses/Error429"
          },
          "500": {
            "$ref": "#/components/responses/Error500"
          }
        },
        "x-codeSamples": [
          {
            "lang": "bash",
            "label": "cURL",
            "source": "curl -sS 'https://queryx.run/v1/search/deep' \\\n  -X POST \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-PAYMENT: <base64url-payment-envelope>' \\\n  -d '{\"query\":\"What changed in x402 payment adoption over the last 6 months?\",\"max_sources\":10}'"
          }
        ]
      }
    },
    "/health": {
      "get": {
        "tags": [
          "Health"
        ],
        "operationId": "healthCheck",
        "summary": "Service health check",
        "description": "Returns service status and basic runtime metadata.",
        "security": [],
        "responses": {
          "200": {
            "description": "Service is healthy.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HealthResponse"
                },
                "examples": {
                  "healthy": {
                    "summary": "Healthy response",
                    "value": {
                      "status": "ok",
                      "version": "1.0.0",
                      "uptime_seconds": 86432,
                      "timestamp": "2026-03-04T16:30:22Z"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "$ref": "#/components/responses/Error500"
          }
        },
        "x-codeSamples": [
          {
            "lang": "bash",
            "label": "cURL",
            "source": "curl -sS 'https://queryx.run/health'"
          }
        ]
      }
    }
  },
  "components": {
    "securitySchemes": {
      "x402": {
        "type": "apiKey",
        "in": "header",
        "name": "X-PAYMENT",
        "description": "x402 payment envelope. Send a base64url-encoded JSON object with fields: payment_id, address, nonce, timestamp, signature, signature_algorithm. Signature is generated from canonical_message returned in the 402 response details."
      }
    },
    "schemas": {
      "SearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "query",
          "request_id",
          "took_ms",
          "total_results",
          "results"
        ],
        "properties": {
          "query": {
            "type": "string"
          },
          "request_id": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "total_results": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SearchResult"
            }
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
          "score",
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
          "query",
          "request_id",
          "took_ms",
          "total_results",
          "results"
        ],
        "properties": {
          "query": {
            "type": "string"
          },
          "request_id": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "total_results": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NewsResult"
            }
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
          "publisher",
          "score",
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
          "publisher": {
            "type": "string"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
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
            "type": "string",
            "minLength": 1,
            "maxLength": 2000
          },
          "objective": {
            "type": "string",
            "maxLength": 4000
          },
          "max_sources": {
            "type": "integer",
            "minimum": 1,
            "maximum": 25,
            "default": 10
          },
          "include_domains": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "maxItems": 50
          },
          "exclude_domains": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "maxItems": 50
          },
          "recency": {
            "type": "string",
            "enum": [
              "day",
              "week",
              "month",
              "year",
              "anytime"
            ],
            "default": "anytime"
          },
          "output_format": {
            "type": "string",
            "enum": [
              "markdown",
              "json"
            ],
            "default": "markdown"
          }
        }
      },
      "DeepSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "query",
          "request_id",
          "took_ms",
          "summary",
          "key_findings",
          "citations",
          "sources_searched",
          "model"
        ],
        "properties": {
          "query": {
            "type": "string"
          },
          "request_id": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "summary": {
            "type": "string"
          },
          "key_findings": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "citations": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Citation"
            }
          },
          "sources_searched": {
            "type": "integer",
            "minimum": 0
          },
          "model": {
            "type": "string"
          }
        }
      },
      "Citation": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "title",
          "url",
          "snippet",
          "source",
          "relevance"
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
          "relevance": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "HealthResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "status",
          "version",
          "uptime_seconds",
          "timestamp"
        ],
        "properties": {
          "status": {
            "type": "string",
            "enum": [
              "ok"
            ]
          },
          "version": {
            "type": "string"
          },
          "uptime_seconds": {
            "type": "integer",
            "minimum": 0
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "error",
          "code",
          "message",
          "request_id",
          "retryable"
        ],
        "properties": {
          "error": {
            "type": "string"
          },
          "code": {
            "type": "string"
          },
          "message": {
            "type": "string"
          },
          "request_id": {
            "type": "string"
          },
          "retryable": {
            "type": "boolean"
          },
          "details": {
            "oneOf": [
              {
                "$ref": "#/components/schemas/PaymentRequiredDetails"
              },
              {
                "$ref": "#/components/schemas/ValidationErrorDetails"
              },
              {
                "$ref": "#/components/schemas/RateLimitErrorDetails"
              },
              {
                "$ref": "#/components/schemas/InternalErrorDetails"
              }
            ]
          }
        }
      },
      "PaymentRequiredDetails": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "payment_id",
          "asset",
          "token_address",
          "chain_id",
          "facilitator_address",
          "amount_base_units",
          "amount_usdc",
          "nonce",
          "timestamp",
          "expires_at",
          "signature_algorithm",
          "canonical_message"
        ],
        "properties": {
          "payment_id": {
            "type": "string"
          },
          "asset": {
            "type": "string",
            "enum": [
              "USDC"
            ]
          },
          "token_address": {
            "type": "string"
          },
          "chain_id": {
            "type": "integer",
            "enum": [
              8453
            ]
          },
          "facilitator_address": {
            "type": "string"
          },
          "amount_base_units": {
            "type": "string",
            "description": "USDC base units (6 decimals)."
          },
          "amount_usdc": {
            "type": "string"
          },
          "nonce": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "expires_at": {
            "type": "string",
            "format": "date-time"
          },
          "signature_algorithm": {
            "type": "string",
            "enum": [
              "eip191_personal_sign"
            ]
          },
          "canonical_message": {
            "type": "string",
            "description": "Exact message that must be signed by the payer wallet."
          }
        }
      },
      "ValidationErrorDetails": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "errors"
        ],
        "properties": {
          "errors": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/FieldValidationError"
            }
          }
        }
      },
      "FieldValidationError": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "path",
          "message"
        ],
        "properties": {
          "path": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      },
      "RateLimitErrorDetails": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "limit",
          "remaining",
          "reset_at",
          "retry_after_seconds"
        ],
        "properties": {
          "limit": {
            "type": "integer",
            "minimum": 1
          },
          "remaining": {
            "type": "integer",
            "minimum": 0
          },
          "reset_at": {
            "type": "string",
            "format": "date-time"
          },
          "retry_after_seconds": {
            "type": "integer",
            "minimum": 1
          }
        }
      },
      "InternalErrorDetails": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "support_code"
        ],
        "properties": {
          "support_code": {
            "type": "string"
          }
        }
      }
    },
    "headers": {
      "X-RateLimit-Limit": {
        "description": "Maximum requests allowed in the current window.",
        "schema": {
          "type": "integer"
        }
      },
      "X-RateLimit-Remaining": {
        "description": "Remaining requests in the current window.",
        "schema": {
          "type": "integer"
        }
      },
      "X-RateLimit-Reset": {
        "description": "Epoch seconds when rate limit resets.",
        "schema": {
          "type": "integer"
        }
      },
      "Retry-After": {
        "description": "Seconds to wait before retrying.",
        "schema": {
          "type": "integer"
        }
      }
    },
    "responses": {
      "Error402": {
        "description": "Payment required. Client must construct x402 payment signature and retry.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            },
            "examples": {
              "paymentRequired": {
                "summary": "x402 challenge",
                "value": {
                  "error": "payment_required",
                  "code": "payment_required",
                  "message": "Payment required for this endpoint.",
                  "request_id": "req_01HTZA2CVG8YPB8BKX4E2V0J5F",
                  "retryable": true,
                  "details": {
                    "payment_id": "pay_01HTZA2CVQY2Z5T9RA2ZES2J8T",
                    "asset": "USDC",
                    "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bDa02913",
                    "chain_id": 8453,
                    "facilitator_address": "0x2B3a5cA6D4E2Ff0dA9fD3C4e8B7A1c2D6E5f9012",
                    "amount_base_units": "2500",
                    "amount_usdc": "0.0025",
                    "nonce": "6f5f9f99b4b64726a1b26c9d8f407ec6",
                    "timestamp": "2026-03-04T16:30:22Z",
                    "expires_at": "2026-03-04T16:32:22Z",
                    "signature_algorithm": "eip191_personal_sign",
                    "canonical_message": "pay_01HTZA2CVQY2Z5T9RA2ZES2J8T\nGET\n/v1/search\nq=base+chain+x402+micropayments&limit=5\n2500\nUS