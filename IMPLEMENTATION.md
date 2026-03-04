=== FILE: openapi.json ===
{
  "openapi": "3.1.0",
  "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
  "info": {
    "title": "Queryx API",
    "summary": "x402-native web, news, and deep research search API.",
    "description": "Queryx provides low-latency search endpoints protected by x402 micropayments on Base using USDC.",
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
      "name": "search",
      "description": "Paid search endpoints."
    },
    {
      "name": "health",
      "description": "Service health endpoint."
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "tags": [
          "health"
        ],
        "summary": "Health check",
        "description": "Returns service availability and version metadata.",
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
                "examples": {
                  "ok": {
                    "value": {
                      "status": "ok",
                      "service": "queryx",
                      "version": "1.0.0",
                      "time": "2026-03-04T12:10:00Z",
                      "uptimeSeconds": 92841
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
          "search"
        ],
        "summary": "Search the web",
        "description": "General web search with optional direct answer synthesis.",
        "operationId": "searchWeb",
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
            "description": "Search query.",
            "schema": {
              "type": "string",
              "minLength": 1,
              "maxLength": 512
            },
            "example": "best vector database for rag"
          },
          {
            "name": "country",
            "in": "query",
            "required": false,
            "description": "ISO-3166 alpha-2 country code used for localization.",
            "schema": {
              "type": "string",
              "pattern": "^[A-Za-z]{2}$",
              "default": "us"
            },
            "example": "us"
          },
          {
            "name": "lang",
            "in": "query",
            "required": false,
            "description": "IETF language code.",
            "schema": {
              "type": "string",
              "default": "en"
            },
            "example": "en"
          },
          {
            "name": "safe",
            "in": "query",
            "required": false,
            "description": "Safe search mode.",
            "schema": {
              "type": "string",
              "enum": [
                "strict",
                "moderate",
                "off"
              ],
              "default": "moderate"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Maximum number of results returned.",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 25,
              "default": 10
            }
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
            }
          },
          {
            "name": "freshness",
            "in": "query",
            "required": false,
            "description": "Result freshness window.",
            "schema": {
              "type": "string",
              "enum": [
                "24h",
                "7d",
                "30d",
                "365d"
              ]
            }
          },
          {
            "name": "includeAnswer",
            "in": "query",
            "required": false,
            "description": "When true, returns an LLM-generated concise answer.",
            "schema": {
              "type": "boolean",
              "default": true
            }
          },
          {
            "$ref": "#/components/parameters/X402AddressHeader"
          },
          {
            "$ref": "#/components/parameters/X402TimestampHeader"
          },
          {
            "$ref": "#/components/parameters/X402NonceHeader"
          },
          {
            "$ref": "#/components/parameters/X402AmountHeader"
          },
          {
            "$ref": "#/components/parameters/X402CurrencyHeader"
          },
          {
            "$ref": "#/components/parameters/X402SignatureHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful web search response.",
            "headers": {
              "X-Request-Id": {
                "description": "Unique request identifier.",
                "schema": {
                  "type": "string"
                }
              },
              "X-RateLimit-Limit": {
                "description": "Requests allowed per minute for this endpoint.",
                "schema": {
                  "type": "integer"
                }
              },
              "X-RateLimit-Remaining": {
                "description": "Remaining requests in the current minute window.",
                "schema": {
                  "type": "integer"
                }
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
                      "id": "srch_01JQXZ9Y8S8Q3X80Q4RZ43V90K",
                      "object": "search.result",
                      "query": "best vector database for rag",
                      "answer": "For most RAG workloads, pick a vector store with strong filtering, hybrid retrieval, and low-latency upserts. Qdrant and Weaviate are common choices.",
                      "results": [
                        {
                          "rank": 1,
                          "title": "Choosing a Vector Database for Production RAG",
                          "url": "https://example.com/vector-db-rag",
                          "snippet": "A comparison of Qdrant, Weaviate, Pinecone, and pgvector for retrieval-augmented generation.",
                          "site": "example.com",
                          "score": 0.93,
                          "publishedAt": "2026-02-16T09:20:00Z"
                        },
                        {
                          "rank": 2,
                          "title": "Hybrid Search Benchmarks",
                          "url": "https://example.org/hybrid-benchmarks",
                          "snippet": "Hybrid BM25 + dense retrieval outperforms single-mode retrieval for many real-world corpora.",
                          "site": "example.org",
                          "score": 0.89,
                          "publishedAt": "2026-01-09T14:08:00Z"
                        }
                      ],
                      "meta": {
                        "latencyMs": 182,
                        "totalEstimated": 1520000,
                        "cached": false
                      },
                      "billing": {
                        "endpoint": "/v1/search",
                        "amountBaseUnits": "20000",
                        "currency": "USDC",
                        "network": "base",
                        "facilitator": "0x7E9f3D7d4A55b7f67C4A6af3E5Db2Aed5f83C8f1",
                        "chargedAt": "2026-03-04T12:10:03Z"
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
            "$ref": "#/components/responses/RateLimited"
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
          "search"
        ],
        "summary": "Search news",
        "description": "News-specific search endpoint with recency controls.",
        "operationId": "searchNews",
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
            "description": "News query.",
            "schema": {
              "type": "string",
              "minLength": 1,
              "maxLength": 512
            },
            "example": "fed interest rate decision"
          },
          {
            "name": "country",
            "in": "query",
            "required": false,
            "description": "ISO-3166 alpha-2 country code used for localization.",
            "schema": {
              "type": "string",
              "pattern": "^[A-Za-z]{2}$",
              "default": "us"
            }
          },
          {
            "name": "lang",
            "in": "query",
            "required": false,
            "description": "IETF language code.",
            "schema": {
              "type": "string",
              "default": "en"
            }
          },
          {
            "name": "from",
            "in": "query",
            "required": false,
            "description": "Start date (inclusive) in YYYY-MM-DD.",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "to",
            "in": "query",
            "required": false,
            "description": "End date (inclusive) in YYYY-MM-DD.",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "sortBy",
            "in": "query",
            "required": false,
            "description": "Sort mode for news results.",
            "schema": {
              "type": "string",
              "enum": [
                "relevance",
                "date"
              ],
              "default": "relevance"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Maximum number of news results returned.",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 50,
              "default": 10
            }
          },
          {
            "$ref": "#/components/parameters/X402AddressHeader"
          },
          {
            "$ref": "#/components/parameters/X402TimestampHeader"
          },
          {
            "$ref": "#/components/parameters/X402NonceHeader"
          },
          {
            "$ref": "#/components/parameters/X402AmountHeader"
          },
          {
            "$ref": "#/components/parameters/X402CurrencyHeader"
          },
          {
            "$ref": "#/components/parameters/X402SignatureHeader"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful news search response.",
            "headers": {
              "X-Request-Id": {
                "description": "Unique request identifier.",
                "schema": {
                  "type": "string"
                }
              },
              "X-RateLimit-Limit": {
                "description": "Requests allowed per minute for this endpoint.",
                "schema": {
                  "type": "integer"
                }
              },
              "X-RateLimit-Remaining": {
                "description": "Remaining requests in the current minute window.",
                "schema": {
                  "type": "integer"
                }
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
                      "id": "news_01JQXZC9Y6PKEE6Y6W19D4TQY2",
                      "object": "news.result",
                      "query": "fed interest rate decision",
                      "results": [
                        {
                          "rank": 1,
                          "title": "Federal Reserve Holds Rates Steady",
                          "url": "https://news.example.com/fed-holds-rates",
                          "snippet": "The Fed kept benchmark rates unchanged, signaling a data-dependent path ahead.",
                          "source": "news.example.com",
                          "publishedAt": "2026-03-03T18:00:00Z",
                          "score": 0.97
                        },
                        {
                          "rank": 2,
                          "title": "Markets React to Latest FOMC Statement",
                          "url": "https://markets.example.org/fomc-reaction",
                          "snippet": "Equities climbed after the statement emphasized cooling inflation trends.",
                          "source": "markets.example.org",
                          "publishedAt": "2026-03-03T18:35:00Z",
                          "score": 0.92
                        }
                      ],
                      "meta": {
                        "latencyMs": 204,
                        "totalEstimated": 14500,
                        "cached": false
                      },
                      "billing": {
                        "endpoint": "/v1/search/news",
                        "amountBaseUnits": "35000",
                        "currency": "USDC",
                        "network": "base",
                        "facilitator": "0x7E9f3D7d4A55b7f67C4A6af3E5Db2Aed5f83C8f1",
                        "chargedAt": "2026-03-04T12:12:20Z"
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
            "$ref": "#/components/responses/RateLimited"
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
          "search"
        ],
        "summary": "Deep research search",
        "description": "Multi-source synthesis endpoint for deeper investigations with citations.",
        "operationId": "deepSearch",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/X402AddressHeader"
          },
          {
            "$ref": "#/components/parameters/X402TimestampHeader"
          },
          {
            "$ref": "#/components/parameters/X402NonceHeader"
          },
          {
            "$ref": "#/components/parameters/X402AmountHeader"
          },
          {
            "$ref": "#/components/parameters/X402CurrencyHeader"
          },
          {
            "$ref": "#/components/parameters/X402SignatureHeader"
          }
        ],
        "requestBody": {
          "required": true,
          "description": "Deep search request payload.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeepSearchRequest"
              },
              "examples": {
                "standard": {
                  "value": {
                    "query": "What are the tradeoffs between retrieval chunk size and answer quality in RAG systems?",
                    "depth": "standard",
                    "maxSources": 12,
                    "includeCitations": true,
                    "includeRawSnippets": false,
                    "focus": [
                      "web",
                      "papers",
                      "docs"
                    ],
                    "timeRange": {
                      "from": "2025-01-01T00:00:00Z",
                      "to": "2026-03-01T00:00:00Z"
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful deep research response.",
            "headers": {
              "X-Request-Id": {
                "description": "Unique request identifier.",
                "schema": {
                  "type": "string"
                }
              },
              "X-RateLimit-Limit": {
                "description": "Requests allowed per minute for this endpoint.",
                "schema": {
                  "type": "integer"
                }
              },
              "X-RateLimit-Remaining": {
                "description": "Remaining requests in the current minute window.",
                "schema": {
                  "type": "integer"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "examples": {
                  "standard": {
                    "value": {
                      "id": "deep_01JQXZJCN2ZEQX0N3QY3A5MKS7",
                      "object": "deep.result",
                      "query": "What are the tradeoffs between retrieval chunk size and answer quality in RAG systems?",
                      "depth": "standard",
                      "summary": "Smaller chunks improve retrieval precision but can fragment context; larger chunks preserve context but increase noise. Hybrid strategies with overlap and reranking usually perform best.",
                      "sections": [
                        {
                          "heading": "Precision vs. context preservation",
                          "content": "Empirical benchmarks show chunk sizes around 256-512 tokens maximize factual precision in QA-heavy corpora, while 768-1024 token chunks help long-form synthesis.",
                          "citationIndexes": [
                            0,
                            2
                          ]
                        },
                        {
                          "heading": "Operational tradeoffs",
                          "content": "Smaller chunks increase index size and retrieval fan-out. Larger chunks reduce index pressure but can lower relevance and increase token usage during generation.",
                          "citationIndexes": [
                            1,
                            3
                          ]
                        }
                      ],
                      "citations": [
                        {
                          "index": 0,
                          "title": "RAG Chunking Strategies in Practice",
                          "url": "https://research.example.com/rag-chunking",
                          "source": "research.example.com",
                          "snippet": "Chunk granularity is a first-order factor in retrieval quality.",
                          "publishedAt": "2025-11-18T10:00:00Z"
                        },
                        {
                          "index": 1,
                          "title": "Efficient Dense Retrieval at Scale",
                          "url": "https://docs.example.org/dense-retrieval-scale",
                          "source": "docs.example.org",
                          "snippet": "Index fan-out and memory pressure scale with document segmentation strategy.",
                          "publishedAt": "2026-01-22T15:25:00Z"
                        }
                      ],
                      "meta": {
                        "latencyMs": 1632,
                        "totalEstimated": 312,
                        "cached": false
                      },
                      "billing": {
                        "endpoint": "/v1/search/deep",
                        "amountBaseUnits": "250000",
                        "currency": "USDC",
                        "network": "base",
                        "facilitator": "0x7E9f3D7d4A55b7f67C4A6af3E5Db2Aed5f83C8f1",
                        "chargedAt": "2026-03-04T12:14:09Z"
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
            "$ref": "#/components/responses/RateLimited"
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
        "name": "X-402-Signature",
        "description": "x402 payment authorization. Signed proof must be sent in `X-402-Signature` with companion headers listed in `x-requiredHeaders`.",
        "x-requiredHeaders": [
          "X-402-Address",
          "X-402-Timestamp",
          "X-402-Nonce",
          "X-402-Amount",
          "X-402-Currency",
          "X-402-Signature"
        ],
        "x-network": "base",
        "x-currency": "USDC",
        "x-facilitator": "0x7E9f3D7d4A55b7f67C4A6af3E5Db2Aed5f83C8f1"
      }
    },
    "parameters": {
      "X402AddressHeader": {
        "name": "X-402-Address",
        "in": "header",
        "required": false,
        "description": "Payer wallet address.",
        "schema": {
          "type": "string",
          "pattern": "^0x[a-fA-F0-9]{40}$"
        },
        "example": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
      },
      "X402TimestampHeader": {
        "name": "X-402-Timestamp",
        "in": "header",
        "required": false,
        "description": "Unix timestamp in seconds when signature was generated.",
        "schema": {
          "type": "integer",
          "minimum": 0
        },
        "example": 1772626322
      },
      "X402NonceHeader": {
        "name": "X-402-Nonce",
        "in": "header",
        "required": false,
        "description": "Client-generated unique nonce (UUID recommended).",
        "schema": {
          "type": "string",
          "minLength": 8,
          "maxLength": 128
        },
        "example": "e95ed706-f766-4c90-bc84-95ca0a9c1267"
      },
      "X402AmountHeader": {
        "name": "X-402-Amount",
        "in": "header",
        "required": false,
        "description": "USDC amount in base units (1 USDC = 1,000,000 base units).",
        "schema": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "example": "20000"
      },
      "X402CurrencyHeader": {
        "name": "X-402-Currency",
        "in": "header",
        "required": false,
        "description": "Payment currency.",
        "schema": {
          "type": "string",
          "enum": [
            "USDC"
          ]
        },
        "example": "USDC"
      },
      "X402SignatureHeader": {
        "name": "X-402-Signature",
        "in": "header",
        "required": false,
        "description": "Hex-encoded signature for canonical x402 payload.",
        "schema": {
          "type": "string",
          "pattern": "^0x[a-fA-F0-9]+$"
        }
      }
    },
    "responses": {
      "PaymentRequired": {
        "description": "Payment is required before processing this request.",
        "headers": {
          "X-402-Amount": {
            "description": "Required payment amount in USDC base units.",
            "schema": {
              "type": "string",
              "pattern": "^[0-9]+$"
            }
          },
          "X-402-Currency": {
            "description": "Required payment currency.",
            "schema": {
              "type": "string",
              "enum": [
                "USDC"
              ]
            }
          }
        },
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/PaymentRequiredResponse"
            },
            "examples": {
              "payment-required": {
                "value": {
                  "error": {
                    "code": "payment_required",
                    "message": "x402 payment is required for this endpoint.",
                    "requestId": "req_01JQXZQ7N5QK8YJ3WHQ4A4RNJB"
                  },
                  "invoice": {
                    "scheme": "x402",
                    "network": "base",
                    "currency": "USDC",
                    "amountBaseUnits": "20000",
                    "facilitator": "0x7E9f3D7d4A55b7f67C4A6af3E5Db2Aed5f83C8f1",
                    "resource": "/v1/search?q=best%20vector%20database%20for%20rag",
                    "expiresAt": "2026-03-04T12:12:00Z"
                  }
                }
              }
            }
          }
        }
      },
      "ValidationError": {
        "description": "Request validation failed.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ValidationErrorResponse"
            },
            "examples": {
              "invalid-parameter": {
                "value": {
                  "error": {
                    "code": "validation_error",
                    "message": "Request validation failed.",
                    "requestId": "req_01JQXZT9Y7W4NPT5M8X3HD1B5R"
                  },
                  "invalidParams": [
                    {
                      "name": "limit",
                      "reason": "must be between 1 and 25"
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "RateLimited": {
        "description": "Too many requests.",
        "headers": {
          "Retry-After": {
            "description": "Number of seconds to wait before retrying.",
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
              "rate-limited": {
                "value": {
                  "error": {
                    "code": "rate_limited",
                    "message": "Too many requests. Retry later.",
                    "requestId": "req_01JQY00H5P83F9N4E8R3XK0DFA"
                  },
                  "retryAfterSeconds": 12
                }
              }
            }
          }
        }
      },
      "InternalError": {
        "description": "Unexpected internal error.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/InternalErrorResponse"
            },
            "examples": {
              "internal": {
                "value": {
                  "error": {
                    "code": "internal_error",
                    "message": "An unexpected error occurred.",
                    "requestId": "req_01JQY04WQJS8ENQBJYXC7YAKH8"
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
          "time",
          "uptimeSeconds"
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
          "time": {
            "type": "string",
            "format": "date-time"
          },
          "uptimeSeconds": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "SearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "object",
          "query",
          "results",
          "meta",
          "billing"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "object": {
            "type": "string",
            "const": "search.result"
          },
          "query": {
            "type": "string"
          },
          "answer": {
            "type": "string"
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SearchResult"
            }
          },
          "meta": {
            "$ref": "#/components/schemas/SearchMeta"
          },
          "billing": {
            "$ref": "#/components/schemas/BillingInfo"
          }
        }
      },
      "SearchResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "rank",
          "title",
          "url",
          "snippet",
          "site",
          "score"
        ],
        "properties": {
          "rank": {
            "type": "integer",
            "minimum": 1
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
          "site": {
            "type": "string"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "publishedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "NewsSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "object",
          "query",
          "results",
          "meta",
          "billing"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "object": {
            "type": "string",
            "const": "news.result"
          },
          "query": {
            "type": "string"
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NewsResult"
            }
          },
          "meta": {
            "$ref": "#/components/schemas/SearchMeta"
          },
          "billing": {
            "$ref": "#/components/schemas/BillingInfo"
          }
        }
      },
      "NewsResult": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "rank",
          "title",
          "url",
          "snippet",
          "source",
          "publishedAt",
          "score"
        ],
        "properties": {
          "rank": {
            "type": "integer",
            "minimum": 1
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
          "publishedAt": {
            "type": "string",
            "format": "date-time"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
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
          "depth": {
            "type": "string",
            "enum": [
              "quick",
              "standard",
              "exhaustive"
            ],
            "default": "standard"
          },
          "maxSources": {
            "type": "integer",
            "minimum": 1,
            "maximum": 50,
            "default": 12
          },
          "includeCitations": {
            "type": "boolean",
            "default": true
          },
          "includeRawSnippets": {
            "type": "boolean",
            "default": false
          },
          "focus": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "web",
                "news",
                "papers",
                "forums",
                "docs"
              ]
            },
            "minItems": 1,
            "uniqueItems": true
          },
          "timeRange": {
            "$ref": "#/components/schemas/TimeRange"
          }
        }
      },
      "DeepSearchResponse": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "object",
          "query",
          "depth",
          "summary",
          "sections",
          "citations",
          "meta",
          "billing"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "object": {
            "type": "string",
            "const": "deep.result"
          },
          "query": {
            "type": "string"
          },
          "depth": {
            "type": "string",
            "enum": [
              "quick",
              "standard",
              "exhaustive"
            ]
          },
          "summary": {
            "type": "string"
          },
          "sections": {
            "type": "