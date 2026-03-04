=== FILE: openapi.json ===
{
  "$schema": "https://spec.openapis.org/oas/3.1/dialect/base",
  "openapi": "3.1.0",
  "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
  "info": {
    "title": "Queryx API",
    "summary": "x402-native web search, news search, and deep research API",
    "description": "Queryx provides low-latency web and news search plus deep research endpoints with x402 USDC micropayments on Base.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://queryx.run",
      "description": "Production"
    }
  ],
  "tags": [
    {
      "name": "Health",
      "description": "Service status endpoint"
    },
    {
      "name": "Search",
      "description": "Web, news, and deep research search endpoints"
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "tags": [
          "Health"
        ],
        "operationId": "getHealth",
        "summary": "Health check",
        "description": "Returns current service health and version information.",
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
                      "uptime_seconds": 43812,
                      "timestamp": "2026-03-04T12:00:00Z"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
          }
        }
      }
    },
    "/v1/search": {
      "get": {
        "tags": [
          "Search"
        ],
        "operationId": "searchWeb",
        "summary": "Web search",
        "description": "Runs a standard web search query. Paid endpoint secured by x402.",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/Query"
          },
          {
            "$ref": "#/components/parameters/Limit"
          },
          {
            "$ref": "#/components/parameters/Offset"
          },
          {
            "$ref": "#/components/parameters/Language"
          },
          {
            "$ref": "#/components/parameters/Country"
          },
          {
            "$ref": "#/components/parameters/SafeSearch"
          },
          {
            "$ref": "#/components/parameters/XPayment"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignature"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddress"
          },
          {
            "$ref": "#/components/parameters/XPaymentTimestamp"
          },
          {
            "$ref": "#/components/parameters/XPaymentNonce"
          }
        ],
        "responses": {
          "200": {
            "description": "Search results returned",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "examples": {
                  "basicSearch": {
                    "value": {
                      "request_id": "11a5ad0a-6de7-46a3-a76f-864d476fc74f",
                      "query": "best open source vector databases",
                      "count": 3,
                      "took_ms": 142,
                      "results": [
                        {
                          "id": "res_01",
                          "title": "Top Open Source Vector Databases in 2026",
                          "url": "https://example.com/vector-db-list",
                          "snippet": "A comparison of Milvus, Qdrant, Weaviate, and pgvector with benchmarks.",
                          "source": "example.com",
                          "published_at": "2026-02-12T10:05:00Z",
                          "score": 0.97,
                          "favicon_url": "https://example.com/favicon.ico",
                          "language": "en"
                        },
                        {
                          "id": "res_02",
                          "title": "Milvus vs Qdrant: Feature Breakdown",
                          "url": "https://example.org/milvus-vs-qdrant",
                          "snippet": "Detailed comparison across indexing types, filtering, and hybrid search.",
                          "source": "example.org",
                          "published_at": "2026-01-03T08:00:00Z",
                          "score": 0.91,
                          "favicon_url": null,
                          "language": "en"
                        },
                        {
                          "id": "res_03",
                          "title": "pgvector for Production Search",
                          "url": "https://example.net/pgvector-production-guide",
                          "snippet": "How teams deploy pgvector for semantic retrieval in PostgreSQL.",
                          "source": "example.net",
                          "published_at": null,
                          "score": 0.86,
                          "favicon_url": null,
                          "language": "en"
                        }
                      ]
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
            "$ref": "#/components/responses/RateLimitError"
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
          }
        }
      }
    },
    "/v1/search/news": {
      "get": {
        "tags": [
          "Search"
        ],
        "operationId": "searchNews",
        "summary": "News search",
        "description": "Runs a freshness-biased news query. Paid endpoint secured by x402.",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/Query"
          },
          {
            "$ref": "#/components/parameters/Limit"
          },
          {
            "$ref": "#/components/parameters/Offset"
          },
          {
            "$ref": "#/components/parameters/Language"
          },
          {
            "$ref": "#/components/parameters/Country"
          },
          {
            "$ref": "#/components/parameters/NewsFrom"
          },
          {
            "$ref": "#/components/parameters/NewsTo"
          },
          {
            "$ref": "#/components/parameters/NewsSort"
          },
          {
            "$ref": "#/components/parameters/XPayment"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignature"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddress"
          },
          {
            "$ref": "#/components/parameters/XPaymentTimestamp"
          },
          {
            "$ref": "#/components/parameters/XPaymentNonce"
          }
        ],
        "responses": {
          "200": {
            "description": "News results returned",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NewsSearchResponse"
                },
                "examples": {
                  "newsSearch": {
                    "value": {
                      "request_id": "f7f10c7a-1518-4418-8a97-fa25d449bc4e",
                      "query": "fed interest rate decision",
                      "count": 2,
                      "took_ms": 169,
                      "results": [
                        {
                          "id": "news_01",
                          "title": "Federal Reserve Holds Rates Steady",
                          "url": "https://news.example.com/fed-holds-rates",
                          "snippet": "The central bank kept rates unchanged in a widely expected decision.",
                          "source": "news.example.com",
                          "published_at": "2026-03-03T18:30:00Z",
                          "image_url": "https://news.example.com/images/fed.jpg",
                          "category": "business",
                          "language": "en"
                        },
                        {
                          "id": "news_02",
                          "title": "Markets React to Fed Guidance",
                          "url": "https://finance.example.org/market-reaction-fed",
                          "snippet": "Stocks moved higher after comments on inflation trends.",
                          "source": "finance.example.org",
                          "published_at": "2026-03-03T20:05:00Z",
                          "image_url": null,
                          "category": "finance",
                          "language": "en"
                        }
                      ]
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
            "$ref": "#/components/responses/RateLimitError"
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
          }
        }
      }
    },
    "/v1/search/deep": {
      "post": {
        "tags": [
          "Search"
        ],
        "operationId": "searchDeep",
        "summary": "Deep research search",
        "description": "Runs multi-step retrieval and synthesis to return a grounded answer with citations. Paid endpoint secured by x402.",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/XPayment"
          },
          {
            "$ref": "#/components/parameters/XPaymentSignature"
          },
          {
            "$ref": "#/components/parameters/XPaymentAddress"
          },
          {
            "$ref": "#/components/parameters/XPaymentTimestamp"
          },
          {
            "$ref": "#/components/parameters/XPaymentNonce"
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
                "deepResearchRequest": {
                  "value": {
                    "query": "Compare RAG chunking strategies for long technical manuals",
                    "max_sources": 12,
                    "max_depth": 2,
                    "include_domains": [
                      "arxiv.org",
                      "acm.org",
                      "docs.example.com"
                    ],
                    "exclude_domains": [
                      "pinterest.com"
                    ],
                    "response_format": "markdown",
                    "citations": true,
                    "context": {
                      "audience": "engineering manager",
                      "target_length": "short"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Deep research response returned",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "examples": {
                  "deepResearchResponse": {
                    "value": {
                      "request_id": "b4f32c3f-72d7-4f79-8f2d-420611f2b2c7",
                      "query": "Compare RAG chunking strategies for long technical manuals",
                      "summary": "Structure-aware chunking with semantic overlap is consistently strongest for long manuals.",
                      "answer": "Across long technical manuals, fixed-size chunking is simplest but loses section semantics and cross-reference context. Structure-aware chunking aligned to headings improves factual grounding and citation precision. Semantic chunking can improve recall but must be constrained by max token budgets and overlap windows. The best production pattern is structure-first chunking with adaptive overlap for tables/procedures, then reranking before final synthesis.",
                      "took_ms": 1894,
                      "citations": [
                        {
                          "id": "c1",
                          "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
                          "url": "https://arxiv.org/abs/2005.11401",
                          "quote": "Chunk granularity significantly impacts retrieval relevance and generation quality."
                        },
                        {
                          "id": "c2",
                          "title": "Practical Considerations for Document Chunking in RAG Systems",
                          "url": "https://example.com/rag-chunking-practical-guide",
                          "quote": "Heading-aware segmentation reduces context fragmentation in long-form documents."
                        }
                      ],
                      "sources": [
                        {
                          "id": "s1",
                          "title": "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
                          "url": "https://arxiv.org/abs/2005.11401",
                          "source_type": "paper",
                          "snippet": "The model combines parametric and non-parametric memory via retrieval."
                        },
                        {
                          "id": "s2",
                          "title": "Practical Considerations for Document Chunking in RAG Systems",
                          "url": "https://example.com/rag-chunking-practical-guide",
                          "source_type": "article",
                          "snippet": "Structure-aware chunking is robust under strict context limits."
                        }
                      ],
                      "usage": {
                        "request_units": 1,
                        "sources_considered": 12,
                        "sources_used": 5
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
            "$ref": "#/components/responses/RateLimitError"
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
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
        "description": "x402 payment envelope (base64url encoded JSON). Include X-Payment, X-Payment-Signature, X-Payment-Address, X-Payment-Timestamp, and X-Payment-Nonce for paid requests.",
        "x-protocol": "x402",
        "x-network": "base",
        "x-currency": "USDC"
      }
    },
    "parameters": {
      "Query": {
        "name": "q",
        "in": "query",
        "required": true,
        "description": "Search query text.",
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "example": "latest breakthroughs in battery technology"
      },
      "Limit": {
        "name": "limit",
        "in": "query",
        "required": false,
        "description": "Maximum number of results to return.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 10
        },
        "example": 10
      },
      "Offset": {
        "name": "offset",
        "in": "query",
        "required": false,
        "description": "Result offset for pagination.",
        "schema": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000,
          "default": 0
        },
        "example": 0
      },
      "Language": {
        "name": "lang",
        "in": "query",
        "required": false,
        "description": "Language code, for example en or en-US.",
        "schema": {
          "type": "string",
          "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
          "default": "en"
        },
        "example": "en"
      },
      "Country": {
        "name": "country",
        "in": "query",
        "required": false,
        "description": "Country code in ISO-3166 alpha-2 format.",
        "schema": {
          "type": "string",
          "pattern": "^[A-Z]{2}$"
        },
        "example": "US"
      },
      "SafeSearch": {
        "name": "safe_search",
        "in": "query",
        "required": false,
        "description": "Safe search filter level.",
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
      },
      "NewsFrom": {
        "name": "from",
        "in": "query",
        "required": false,
        "description": "Return news published on or after this timestamp.",
        "schema": {
          "type": "string",
          "format": "date-time"
        },
        "example": "2026-03-01T00:00:00Z"
      },
      "NewsTo": {
        "name": "to",
        "in": "query",
        "required": false,
        "description": "Return news published on or before this timestamp.",
        "schema": {
          "type": "string",
          "format": "date-time"
        },
        "example": "2026-03-04T23:59:59Z"
      },
      "NewsSort": {
        "name": "sort",
        "in": "query",
        "required": false,
        "description": "Sort order for news results.",
        "schema": {
          "type": "string",
          "enum": [
            "relevance",
            "latest"
          ],
          "default": "relevance"
        },
        "example": "latest"
      },
      "XPayment": {
        "name": "X-Payment",
        "in": "header",
        "required": false,
        "description": "x402 payment envelope as base64url(JSON). Required for paid request settlement.",
        "schema": {
          "type": "string",
          "minLength": 16
        }
      },
      "XPaymentSignature": {
        "name": "X-Payment-Signature",
        "in": "header",
        "required": false,
        "description": "secp256k1 signature over canonical request string.",
        "schema": {
          "type": "string",
          "minLength": 16
        }
      },
      "XPaymentAddress": {
        "name": "X-Payment-Address",
        "in": "header",
        "required": false,
        "description": "Payer wallet address on Base.",
        "schema": {
          "type": "string",
          "pattern": "^0x[a-fA-F0-9]{40}$"
        },
        "example": "0x5b38Da6a701c568545dCfcB03FcB875f56beddC4"
      },
      "XPaymentTimestamp": {
        "name": "X-Payment-Timestamp",
        "in": "header",
        "required": false,
        "description": "Unix timestamp (seconds) used in canonical signature.",
        "schema": {
          "type": "integer",
          "minimum": 1700000000
        },
        "example": 1772625600
      },
      "XPaymentNonce": {
        "name": "X-Payment-Nonce",
        "in": "header",
        "required": false,
        "description": "Client-generated unique nonce for replay protection.",
        "schema": {
          "type": "string",
          "minLength": 8,
          "maxLength": 128
        },
        "example": "e7f1f403-4f11-4d9f-92f2-3f62c9acb5ee"
      }
    },
    "responses": {
      "PaymentRequired": {
        "description": "Payment is required before this request can be processed.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/PaymentRequiredErrorResponse"
            },
            "examples": {
              "paymentRequired": {
                "value": {
                  "request_id": "1c108f27-6154-4ee8-b6b1-72db6a93e83d",
                  "error": {
                    "code": "payment_required",
                    "message": "x402 payment required for this endpoint.",
                    "details": null
                  },
                  "payment": {
                    "network": "base",
                    "asset": "USDC",
                    "amount": "2500",
                    "amount_decimal": "0.0025",
                    "facilitator": "0x8fF5d1A6B7C35E4a2f90Aa64b1D9fA41A6a6b0C2",
                    "expires_at": "2026-03-04T12:01:00Z"
                  }
                }
              }
            }
          }
        }
      },
      "ValidationError": {
        "description": "The request failed validation.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ValidationErrorResponse"
            },
            "examples": {
              "invalidQuery": {
                "value": {
                  "request_id": "fcb16e8f-8f29-4f8d-b62a-37a8d5dd22d2",
                  "error": {
                    "code": "validation_error",
                    "message": "Request validation failed.",
                    "details": null
                  },
                  "errors": [
                    {
                      "field": "q",
                      "message": "Query must be at least 1 character."
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "RateLimitError": {
        "description": "Rate limit exceeded.",
        "headers": {
          "Retry-After": {
            "description": "Seconds until another request may be attempted.",
            "schema": {
              "type": "integer",
              "minimum": 1
            }
          }
        },
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/RateLimitErrorResponse"
            },
            "examples": {
              "tooManyRequests": {
                "value": {
                  "request_id": "dce2e194-4229-4f04-8f34-a43b4eb7f436",
                  "error": {
                    "code": "rate_limited",
                    "message": "Rate limit exceeded.",
                    "details": null
                  },
                  "retry_after_ms": 2000,
                  "limit": 120,
                  "window_ms": 60000
                }
              }
            }
          }
        }
      },
      "InternalError": {
        "description": "Unexpected server error.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/InternalErrorResponse"
            },
            "examples": {
              "internalError": {
                "value": {
                  "request_id": "e0cd9e63-8b15-4d6f-9421-4ec14f75be80",
                  "error": {
                    "code": "internal_error",
                    "message": "Unexpected internal error.",
                    "details": null
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
          "service": {
            "type": "string",
            "example": "queryx"
          },
          "version": {
            "type": "string",
            "example": "1.0.0"
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
      "SearchResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "url",
          "snippet",
          "source",
          "published_at",
          "score",
          "favicon_url",
          "language"
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
          "source": {
            "type": "string"
          },
          "published_at": {
            "type": [
              "string",
              "null"
            ],
            "format": "date-time"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "favicon_url": {
            "type": [
              "string",
              "null"
            ],
            "format": "uri"
          },
          "language": {
            "type": [
              "string",
              "null"
            ],
            "pattern": "^[a-z]{2}(-[A-Z]{2})?$"
          }
        }
      },
      "SearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "query",
          "count",
          "took_ms",
          "results"
        ],
        "properties": {
          "request_id": {
            "type": "string",
            "format": "uuid"
          },
          "query": {
            "type": "string"
          },
          "count": {
            "type": "integer",
            "minimum": 0
          },
          "took_ms": {
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
      "NewsResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "url",
          "snippet",
          "source",
          "published_at",
          "image_url",
          "category",
          "language"
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
          "source": {
            "type": "string"
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
          },
          "category": {
            "type": [
              "string",
              "null"
            ]
          },
          "language": {
            "type": [
              "string",
              "null"
            ],
            "pattern": "^[a-z]{2}(-[A-Z]{2})?$"
          }
        }
      },
      "NewsSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "query",
          "count",
          "took_ms",
          "results"
        ],
        "properties": {
          "request_id": {
            "type": "string",
            "format": "uuid"
          },
          "query": {
            "type": "string"
          },
          "count": {
            "type": "integer",
            "minimum": 0
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
            "maxLength": 4000
          },
          "max_sources": {
            "type": "integer",
            "minimum": 1,
            "maximum": 50,
            "default": 12
          },
          "max_depth": {
            "type": "integer",
            "minimum": 1,
            "maximum": 4,
            "default": 2
          },
          "include_domains": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "default": []
          },
          "exclude_domains": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "default": []
          },
          "response_format": {
            "type": "string",
            "enum": [
              "markdown",
              "json"
            ],
            "default": "markdown"
          },
          "citations": {
            "type": "boolean",
            "default": true
          },
          "context": {
            "type": "object",
            "additionalProperties": {
              "type": "string"
            },
            "default": {}
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
          "quote"
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
          "quote": {
            "type": "string"
          }
        }
      },
      "DeepSource": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "url",
          "source_type",
          "snippet"
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
          "source_type": {
            "type": "string",
            "enum": [
              "article",
              "paper",
              "docs",
              "other"
            ]
          },
          "snippet": {
            "type": "string"
          }
        }
      },
      "DeepUsage": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_units",
          "sources_considered",
          "sources_used"
        ],
        "properties": {
          "request_units": {
            "type": "integer",
            "minimum": 1
          },
          "sources_considered": {
            "type": "integer",
            "minimum": 0
          },
          "sources_used": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "DeepSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "query",
          "summary",
          "answer",
          "took_ms",
          "citations",
          "sources",
          "usage"
        ],
        "properties": {
          "request_id": {
            "type": "string",
            "format": "uuid"
          },
          "query": {
            "type": "string"
          },
          "summary": {
            "type": "string"
          },
          "answer": {
            "type": "string"
          },
          "took_ms": {
            "type": "integer",
            "minimum": 0
          },
          "citations": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/DeepCitation"
            }
          },
          "sources": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/DeepSource"
            }
          },
          "usage": {
            "$ref": "#/components/schemas/DeepUsage"
          }
        }
      },
      "ErrorObject": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "code",
          "message",
          "details"
        ],
        "properties": {
          "code": {
            "type": "string",
            "enum": [
              "payment_required",
              "validation_error",
              "rate_limited",
              "internal_error"
            ]
          },
          "message": {
            "type": "string"
          },
          "details": {
            "type": [
              "object",
              "null"
            ],
            "additionalProperties": true
          }
        }
      },
      "BaseErrorResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "request_id",
          "error"
        ],
        "properties": {
          "request_id": {
            "type": "string",
            "format": "uuid"
          },
          "error": {
            "$ref": "#/components/schemas/ErrorObject"
          }
        }
      },
      "PaymentRequirements