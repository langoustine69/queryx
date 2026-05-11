import { describe, expect, test } from "bun:test";
import {
  buildSearchResponse,
  estimateResultsAge,
  normalizeQuery,
} from "../../src/logic/search";
import type { SearchResult } from "../../src/logic/brave";

const sources: SearchResult[] = [
  {
    title: "Recent result",
    url: "https://example.com/recent",
    snippet: "A detailed recent source about the requested topic.",
    published: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

describe("search orchestration helpers", () => {
  test("normalizes query whitespace for routing and cache keys", () => {
    expect(normalizeQuery("  Fed   rate\n decision  ")).toBe(
      "Fed rate decision",
    );
  });

  test("rejects empty normalized queries", () => {
    expect(() => normalizeQuery(" \n\t ")).toThrow("Query is required");
  });

  test("estimates result age from the newest published source", () => {
    expect(estimateResultsAge(sources)).toMatch(/^[0-9]+h$/);
  });

  test("builds a response with freshness, confidence, model, and token metadata", () => {
    const response = buildSearchResponse({
      query: "Fed rate decision",
      sources,
      synthesis: {
        answer: "The Fed held rates steady.",
        confidence: 0.7,
        model: "queryx-fast-v1",
        tokens: { in: 10, out: 20 },
      },
      fetchedAt: "2026-05-11T04:00:00.000Z",
    });

    expect(response.query).toBe("Fed rate decision");
    expect(response.freshness.fetchedAt).toBe("2026-05-11T04:00:00.000Z");
    expect(response.confidence).toBe(0.7);
    expect(response.tokens.out).toBe(20);
  });
});
