=== FILE: openapi.json ===
{
  "openapi": "3.1.0",
  "jsonSchemaDialect": "https://json-schema.org/draft/2020-12/schema",
  "info": {
    "title": "Queryx API",
    "version": "1.0.0",
    "description": "Queryx is an x402-native search API on Base. Paid endpoints require x402 payment headers (`X-402-Payment` + `X-402-Signature`).",
    "contact": {
      "name": "Queryx"
    }
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
      "description": "Service health checks"
    },
    {
      "name": "Search",
      "description": "Paid web/news/deep research endpoints"
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
        "description": "Returns service liveness and build/runtime metadata.",
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
                      "timestamp": "2026-03-04T10:12:45Z",
                      "uptimeSeconds": 532980
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
        "description": "Searches the public web for a query. Requires x402 payment.",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/X402SignatureHeader"
          },
          {
            "$ref": "#/components/parameters/QueryParam"
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
            "$ref": "#/components/parameters/TimeRangeParam"
          },
          {
            "$ref": "#/components/parameters/PageParam"
          }
        ],
        "responses": {
          "200": {
            "description": "Web search results",
            "headers": {
              "X-RateLimit-Limit": {
                "schema": {
                  "type": "integer",
                  "example": 120
                },
                "description": "Requests allowed per rolling 60-second window for this endpoint."
              },
              "X-RateLimit-Remaining": {
                "schema": {
                  "type": "integer",
                  "example": 119
                }
              },
              "X-RateLimit-Reset": {
                "schema": {
                  "type": "integer",
                  "example": 1710000059
                },
                "description": "Unix epoch seconds when the current window resets."
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SearchResponse"
                },
                "examples": {
                  "success": {
                    "value": {
                      "id": "srch_01JP5B4V2Y1X4W7N9A3ZQ8M2P0",
                      "query": "best vector database for rag",
                      "tookMs": 412,
                      "page": 1,
                      "limit": 5,
                      "totalEstimatedResults": 1240000,
                      "results": [
                        {
                          "title": "Vector Databases for Retrieval-Augmented Generation",
                          "url": "https://example.com/vector-db-rag",
                          "snippet": "A practical comparison of Pinecone, Weaviate, Qdrant, and pgvector for RAG workloads.",
                          "source": "example.com",
                          "publishedAt": "2026-02-18T13:00:00Z",
                          "score": 0.98,
                          "faviconUrl": "https://example.com/favicon.ico"
                        },
                        {
                          "title": "pgvector vs Dedicated Vector DBs",
                          "url": "https://example.org/pgvector-vs-dedicated",
                          "snippet": "When Postgres with pgvector is enough, and when to move to a specialized store.",
                          "source": "example.org",
                          "publishedAt": "2026-01-29T08:22:11Z",
                          "score": 0.94,
                          "faviconUrl": "https://example.org/favicon.png"
                        }
                      ],
                      "nextPage": 2,
                      "charge": {
                        "asset": "USDC",
                        "chain": "base",
                        "amountBaseUnits": "2500",
                        "amount": "0.0025"
                      }
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequiredSearch"
          },
          "422": {
            "$ref": "#/components/responses/ValidationError"
          },
          "429": {
            "$ref": "#/components/responses/RateLimitExceeded"
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
          }
        },
        "x-pricing": {
          "asset": "USDC",
          "chain": "base",
          "amountBaseUnits": "2500",
          "amount": "0.0025"
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
        "description": "Searches recent news sources with recency-aware ranking. Requires x402 payment.",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/X402SignatureHeader"
          },
          {
            "$ref": "#/components/parameters/QueryParam"
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
            "$ref": "#/components/parameters/NewsFromParam"
          },
          {
            "$ref": "#/components/parameters/PageParam"
          }
        ],
        "responses": {
          "200": {
            "description": "News search results",
            "headers": {
              "X-RateLimit-Limit": {
                "schema": {
                  "type": "integer",
                  "example": 90
                }
              },
              "X-RateLimit-Remaining": {
                "schema": {
                  "type": "integer",
                  "example": 89
                }
              },
              "X-RateLimit-Reset": {
                "schema": {
                  "type": "integer",
                  "example": 1710000059
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/NewsSearchResponse"
                },
                "examples": {
                  "success": {
                    "value": {
                      "id": "news_01JP5BFJGDXM8R4NCC2P8XQ2N1",
                      "query": "fed interest rates",
                      "tookMs": 376,
                      "page": 1,
                      "limit": 3,
                      "totalEstimatedResults": 18200,
                      "results": [
                        {
                          "title": "Federal Reserve Holds Rates Steady",
                          "url": "https://news.example.com/fed-holds-rates",
                          "snippet": "Officials signaled they still expect cuts later this year if inflation cools.",
                          "source": "news.example.com",
                          "outlet": "Example News",
                          "publishedAt": "2026-03-03T18:34:00Z",
                          "imageUrl": "https://news.example.com/images/fed.jpg",
                          "score": 0.97
                        },
                        {
                          "title": "Markets React to Fed Decision",
                          "url": "https://markets.example.org/fed-market-reaction",
                          "snippet": "Treasury yields dipped while equities turned mixed after the announcement.",
                          "source": "markets.example.org",
                          "outlet": "Markets Daily",
                          "publishedAt": "2026-03-03T19:08:00Z",
                          "imageUrl": "https://markets.example.org/images/rates.png",
                          "score": 0.95
                        }
                      ],
                      "nextPage": 2,
                      "charge": {
                        "asset": "USDC",
                        "chain": "base",
                        "amountBaseUnits": "3500",
                        "amount": "0.0035"
                      }
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequiredNews"
          },
          "422": {
            "$ref": "#/components/responses/ValidationError"
          },
          "429": {
            "$ref": "#/components/responses/RateLimitExceeded"
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
          }
        },
        "x-pricing": {
          "asset": "USDC",
          "chain": "base",
          "amountBaseUnits": "3500",
          "amount": "0.0035"
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
        "description": "Runs a multi-source deep research pass and returns a synthesized report with citations. Requires x402 payment.",
        "security": [
          {
            "x402": []
          }
        ],
        "parameters": [
          {
            "$ref": "#/components/parameters/X402SignatureHeader"
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
                "standard": {
                  "value": {
                    "query": "compare open-source observability stacks for kubernetes",
                    "depth": "standard",
                    "maxSources": 10,
                    "includeDomains": [
                      "cncf.io",
                      "opentelemetry.io"
                    ],
                    "excludeDomains": [
                      "reddit.com"
                    ],
                    "style": "balanced",
                    "includeRawResults": false
                  }
                },
                "comprehensive": {
                  "value": {
                    "query": "state of solid-state battery commercialization timelines",
                    "depth": "comprehensive",
                    "maxSources": 20,
                    "style": "thorough",
                    "includeRawResults": true
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Deep research report",
            "headers": {
              "X-RateLimit-Limit": {
                "schema": {
                  "type": "integer",
                  "example": 30
                }
              },
              "X-RateLimit-Remaining": {
                "schema": {
                  "type": "integer",
                  "example": 29
                }
              },
              "X-RateLimit-Reset": {
                "schema": {
                  "type": "integer",
                  "example": 1710000059
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DeepSearchResponse"
                },
                "examples": {
                  "success": {
                    "value": {
                      "id": "deep_01JP5BR2B3FDMZ1W9W5V8PNN7X",
                      "query": "state of solid-state battery commercialization timelines",
                      "depth": "comprehensive",
                      "tookMs": 4821,
                      "summary": "Solid-state batteries are moving from pilot to early commercial deployments, with meaningful scale expected between 2027 and 2030.",
                      "report": "## Commercialization outlook\nMost manufacturers remain in pilot-scale or limited-volume production...",
                      "keyFindings": [
                        "Pilot lines are live across automotive suppliers in Asia, Europe, and the U.S.",
                        "Cost parity with high-nickel lithium-ion is unlikely before late 2028 for most use cases.",
                        "Automotive deployments are expected to lead consumer electronics in absolute pack volume."
                      ],
                      "citations": [
                        {
                          "id": "c1",
                          "title": "Automaker Roadmap for Solid-State Cells",
                          "url": "https://example.com/automaker-solid-state-roadmap",
                          "snippet": "Volume production target moved to 2028 with pilot fleet testing in 2027.",
                          "source": "example.com",
                          "publishedAt": "2026-01-15T09:30:00Z"
                        },
                        {
                          "id": "c2",
                          "title": "Electrolyte Manufacturing Constraints",
                          "url": "https://example.org/electrolyte-manufacturing",
                          "snippet": "Sulfide electrolyte scale-up remains a bottleneck through 2027.",
                          "source": "example.org",
                          "publishedAt": "2025-12-02T14:04:00Z"
                        }
                      ],
                      "searchResultsAnalyzed": 20,
                      "charge": {
                        "asset": "USDC",
                        "chain": "base",
                        "amountBaseUnits": "15000",
                        "amount": "0.0150"
                      }
                    }
                  }
                }
              }
            }
          },
          "402": {
            "$ref": "#/components/responses/PaymentRequiredDeep"
          },
          "422": {
            "$ref": "#/components/responses/ValidationError"
          },
          "429": {
            "$ref": "#/components/responses/RateLimitExceeded"
          },
          "500": {
            "$ref": "#/components/responses/InternalError"
          }
        },
        "x-pricing": {
          "asset": "USDC",
          "chain": "base",
          "amountBaseUnits": "15000",
          "amount": "0.0150"
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "x402": {
        "type": "apiKey",
        "in": "header",
        "name": "X-402-Payment",
        "description": "Base64-encoded JSON x402 payment payload. Must be accompanied by `X-402-Signature`."
      }
    },
    "parameters": {
      "X402SignatureHeader": {
        "name": "X-402-Signature",
        "in": "header",
        "required": true,
        "description": "Hex ECDSA signature for the canonical payment message.",
        "schema": {
          "type": "string",
          "pattern": "^0x[a-fA-F0-9]{130}$",
          "example": "0x2f9d0019f5ea73f5d9882e5365f28f84a7ea6a2b00823fb2047680cc7f1f3dcd4f8cc127f0d3e29d0a9f16ed1782cfa884c42091efdb7ee64fd4495cf9ef4f4e1b"
        }
      },
      "QueryParam": {
        "name": "q",
        "in": "query",
        "required": true,
        "description": "Search query string.",
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000
        },
        "example": "open telemetry collector scaling best practices"
      },
      "LimitParam": {
        "name": "limit",
        "in": "query",
        "required": false,
        "description": "Number of results to return.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "default": 10
        },
        "example": 10
      },
      "LangParam": {
        "name": "lang",
        "in": "query",
        "required": false,
        "description": "Language code for ranking preference.",
        "schema": {
          "type": "string",
          "pattern": "^[a-z]{2}(-[A-Z]{2})?$",
          "default": "en"
        },
        "example": "en"
      },
      "RegionParam": {
        "name": "region",
        "in": "query",
        "required": false,
        "description": "Region code for localized ranking.",
        "schema": {
          "type": "string",
          "minLength": 2,
          "maxLength": 5
        },
        "example": "US"
      },
      "SafeSearchParam": {
        "name": "safe_search",
        "in": "query",
        "required": false,
        "description": "Filters explicit content from search results.",
        "schema": {
          "type": "boolean",
          "default": true
        },
        "example": true
      },
      "TimeRangeParam": {
        "name": "time_range",
        "in": "query",
        "required": false,
        "description": "Recency filter for web results.",
        "schema": {
          "type": "string",
          "enum": [
            "24h",
            "7d",
            "30d",
            "365d",
            "all"
          ],
          "default": "all"
        },
        "example": "30d"
      },
      "NewsFromParam": {
        "name": "from",
        "in": "query",
        "required": false,
        "description": "Only return news newer than this ISO-8601 timestamp.",
        "schema": {
          "type": "string",
          "format": "date-time"
        },
        "example": "2026-03-01T00:00:00Z"
      },
      "PageParam": {
        "name": "page",
        "in": "query",
        "required": false,
        "description": "1-based page index.",
        "schema": {
          "type": "integer",
          "minimum": 1,
          "default": 1
        },
        "example": 1
      }
    },
    "schemas": {
      "HealthResponse": {
        "type": "object",
        "required": [
          "status",
          "service",
          "version",
          "timestamp",
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
          "uptimeSeconds": {
            "type": "integer",
            "minimum": 0
          }
        }
      },
      "Charge": {
        "type": "object",
        "required": [
          "asset",
          "chain",
          "amountBaseUnits",
          "amount"
        ],
        "properties": {
          "asset": {
            "type": "string",
            "enum": [
              "USDC"
            ]
          },
          "chain": {
            "type": "string",
            "enum": [
              "base"
            ]
          },
          "amountBaseUnits": {
            "type": "string",
            "pattern": "^[0-9]+$",
            "description": "USDC base units (6 decimals)."
          },
          "amount": {
            "type": "string",
            "pattern": "^[0-9]+(\\.[0-9]{1,6})?$",
            "description": "Human-readable USDC amount."
          }
        }
      },
      "SearchResult": {
        "type": "object",
        "required": [
          "title",
          "url",
          "snippet",
          "source"
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
          "publishedAt": {
            "type": "string",
            "format": "date-time"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "faviconUrl": {
            "type": "string",
            "format": "uri"
          }
        }
      },
      "SearchResponse": {
        "type": "object",
        "required": [
          "id",
          "query",
          "tookMs",
          "page",
          "limit",
          "totalEstimatedResults",
          "results",
          "charge"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "query": {
            "type": "string"
          },
          "tookMs": {
            "type": "integer",
            "minimum": 0
          },
          "page": {
            "type": "integer",
            "minimum": 1
          },
          "limit": {
            "type": "integer",
            "minimum": 1
          },
          "totalEstimatedResults": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/SearchResult"
            }
          },
          "nextPage": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 2
          },
          "charge": {
            "$ref": "#/components/schemas/Charge"
          }
        }
      },
      "NewsResult": {
        "type": "object",
        "required": [
          "title",
          "url",
          "snippet",
          "source",
          "outlet",
          "publishedAt"
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
          "outlet": {
            "type": "string"
          },
          "publishedAt": {
            "type": "string",
            "format": "date-time"
          },
          "imageUrl": {
            "type": "string",
            "format": "uri"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          }
        }
      },
      "NewsSearchResponse": {
        "type": "object",
        "required": [
          "id",
          "query",
          "tookMs",
          "page",
          "limit",
          "totalEstimatedResults",
          "results",
          "charge"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "query": {
            "type": "string"
          },
          "tookMs": {
            "type": "integer",
            "minimum": 0
          },
          "page": {
            "type": "integer",
            "minimum": 1
          },
          "limit": {
            "type": "integer",
            "minimum": 1
          },
          "totalEstimatedResults": {
            "type": "integer",
            "minimum": 0
          },
          "results": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/NewsResult"
            }
          },
          "nextPage": {
            "type": [
              "integer",
              "null"
            ],
            "minimum": 2
          },
          "charge": {
            "$ref": "#/components/schemas/Charge"
          }
        }
      },
      "DeepSearchRequest": {
        "type": "object",
        "required": [
          "query"
        ],
        "properties": {
          "query": {
            "type": "string",
            "minLength": 1,
            "maxLength": 2000
          },
          "depth": {
            "type": "string",
            "enum": [
              "standard",
              "comprehensive"
            ],
            "default": "standard"
          },
          "maxSources": {
            "type": "integer",
            "minimum": 3,
            "maximum": 50,
            "default": 12
          },
          "includeDomains": {
            "type": "