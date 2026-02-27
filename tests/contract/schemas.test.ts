/**
 * Contract tests — all request/response schemas, error envelopes.
 */
import { describe, test, expect } from "bun:test";
import {
  SearchResponseSchema,
  SearchQuerySchema,
  DeepSearchBodySchema,
  ErrorSchema,
  HealthSchema,
  SourceSchema,
} from "../../src/schemas";

describe("SearchQuerySchema", () => {
  test("accepts valid query", () => {
    const result = SearchQuerySchema.safeParse({ q: "test query" });
    expect(result.success).toBe(true);
  });

  test("rejects empty query", () => {
    const result = SearchQuerySchema.safeParse({ q: "" });
    expect(result.success).toBe(false);
  });

  test("defaults count to 5", () => {
    const result = SearchQuerySchema.parse({ q: "test" });
    expect(result.count).toBe(5);
  });

  test("coerces string count", () => {
    const result = SearchQuerySchema.parse({ q: "test", count: "3" });
    expect(result.count).toBe(3);
  });
});

describe("DeepSearchBodySchema", () => {
  test("accepts valid body", () => {
    const result = DeepSearchBodySchema.safeParse({ query: "deep test" });
    expect(result.success).toBe(true);
  });

  test("defaults sources to 5", () => {
    const result = DeepSearchBodySchema.parse({ query: "test" });
    expect(result.sources).toBe(5);
  });

  test("rejects sources > 10", () => {
    const result = DeepSearchBodySchema.safeParse({ query: "t", sources: 15 });
    expect(result.success).toBe(false);
  });
});

describe("SearchResponseSchema", () => {
  const validResponse = {
    query: "test",
    answer: "This is an answer.",
    sources: [
      { title: "Source 1", url: "https://example.com", snippet: "snippet" },
    ],
    confidence: 0.87,
    freshness: { fetchedAt: "2026-02-27T10:00:00Z", resultsAge: "4h" },
    model: "queryx-fast-v1",
    tokens: { in: 312, out: 187 },
  };

  test("accepts valid response", () => {
    const result = SearchResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  test("rejects confidence > 1", () => {
    const result = SearchResponseSchema.safeParse({
      ...validResponse,
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing freshness", () => {
    const { freshness, ...rest } = validResponse;
    const result = SearchResponseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("SourceSchema", () => {
  test("accepts source with published date", () => {
    const result = SourceSchema.safeParse({
      title: "Test",
      url: "https://example.com",
      snippet: "A snippet",
      published: "2026-02-27T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("accepts source without published date", () => {
    const result = SourceSchema.safeParse({
      title: "Test",
      url: "https://example.com",
      snippet: "A snippet",
    });
    expect(result.success).toBe(true);
  });
});

describe("ErrorSchema", () => {
  test("accepts valid error", () => {
    const result = ErrorSchema.safeParse({
      error: "Not found",
      code: "NOT_FOUND",
      status: 404,
    });
    expect(result.success).toBe(true);
  });
});

describe("HealthSchema", () => {
  test("accepts valid health", () => {
    const result = HealthSchema.safeParse({
      status: "ok",
      version: "0.1.0",
      uptime: 3600,
    });
    expect(result.success).toBe(true);
  });

  test("rejects wrong status literal", () => {
    const result = HealthSchema.safeParse({
      status: "error",
      version: "0.1.0",
      uptime: 0,
    });
    expect(result.success).toBe(false);
  });
});
