import { describe, it, expect } from "bun:test";
import { rank } from "../../src/logic/rank";
import type { SearchResult } from "../../src/logic/brave";

const makeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  title: "Test Result",
  url: "https://example.com/page",
  snippet: "This is a test snippet with enough length to pass quality filters for ranking.",
  ...overrides,
});

describe("rank", () => {
  it("returns results sorted by quality score", () => {
    const results: SearchResult[] = [
      makeResult({ snippet: "Short" }), // low quality - too short
      makeResult({
        url: "https://good.com",
        snippet: "A comprehensive article about the topic with detailed analysis and multiple data points covering the full breadth of the subject matter.",
        published: "2026-02-26",
      }),
      makeResult({
        url: "https://ok.com",
        snippet: "A decent snippet about the topic with some useful information.",
      }),
    ];

    const ranked = rank(results);
    // Good.com should be first (has recency + long snippet)
    expect(ranked[0].url).toBe("https://good.com");
  });

  it("limits results per domain to 2", () => {
    const results: SearchResult[] = [
      makeResult({ url: "https://example.com/1", snippet: "First result from example domain with enough content." }),
      makeResult({ url: "https://example.com/2", snippet: "Second result from example domain with enough content." }),
      makeResult({ url: "https://example.com/3", snippet: "Third result from example domain with enough content." }),
    ];

    const ranked = rank(results);
    expect(ranked.length).toBe(2);
  });

  it("filters out suspicious domains", () => {
    const results: SearchResult[] = [
      makeResult({ url: "https://pinterest.com/pin/123" }),
      makeResult({ url: "https://quora.com/what-is" }),
      makeResult({ url: "https://good-site.com/article", snippet: "A legitimate article with plenty of useful content for the reader." }),
    ];

    const ranked = rank(results);
    expect(ranked.length).toBe(1);
    expect(ranked[0].url).toContain("good-site.com");
  });

  it("filters results without snippets", () => {
    const results: SearchResult[] = [
      makeResult({ snippet: "" }),
      makeResult({ snippet: "tiny" }),
      makeResult({ url: "https://valid.com", snippet: "This result has a proper snippet with useful information for the user." }),
    ];

    const ranked = rank(results);
    expect(ranked.length).toBe(1);
    expect(ranked[0].url).toContain("valid.com");
  });

  it("respects topN parameter", () => {
    const results = Array.from({ length: 20 }, (_, i) =>
      makeResult({
        url: `https://site${i}.com/page`,
        snippet: `Result number ${i} with enough content to pass the quality filter for ranking purposes.`,
      }),
    );

    const ranked = rank(results, 5);
    expect(ranked.length).toBe(5);
  });

  it("returns empty array for empty input", () => {
    expect(rank([])).toEqual([]);
  });

  it("boosts recent results", () => {
    const old = makeResult({
      url: "https://old.com",
      snippet: "An old article about something that happened a while ago with details.",
      published: "2020-01-01",
    });
    const recent = makeResult({
      url: "https://new.com",
      snippet: "A recent article about something that just happened with details.",
      published: new Date().toISOString(),
    });

    const ranked = rank([old, recent]);
    expect(ranked[0].url).toBe("https://new.com");
  });

  it("strips www from domain comparison", () => {
    const results: SearchResult[] = [
      makeResult({ url: "https://www.example.com/1", snippet: "First result with www prefix domain and enough content." }),
      makeResult({ url: "https://example.com/2", snippet: "Second result without www prefix domain and enough content." }),
      makeResult({ url: "https://www.example.com/3", snippet: "Third result with www prefix domain and enough content." }),
    ];

    const ranked = rank(results);
    // Should count www.example.com and example.com as same domain
    expect(ranked.length).toBe(2);
  });
});
