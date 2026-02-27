import { describe, test, expect } from "bun:test";
import { rank } from "../../src/logic/rank";
import type { SearchResult } from "../../src/logic/brave";

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    title: "Test Article Title Here",
    url: "https://example.com/article",
    snippet: "A detailed enough snippet about the search topic for testing purposes.",
    ...overrides,
  };
}

describe("rank", () => {
  test("filters results with no/short snippet", () => {
    const results = [
      makeResult({ snippet: "", url: "https://a.com/1" }),
      makeResult({ snippet: "too short", url: "https://b.com/1" }),
      makeResult({ snippet: "A proper snippet with enough content to be useful for ranking.", url: "https://c.com/1" }),
    ];
    const ranked = rank(results);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].url).toBe("https://c.com/1");
  });

  test("filters suspicious domains", () => {
    const results = [
      makeResult({ url: "https://pinterest.com/pin/123" }),
      makeResult({ url: "https://quora.com/question" }),
      makeResult({ url: "https://reuters.com/article" }),
    ];
    const ranked = rank(results);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].url).toBe("https://reuters.com/article");
  });

  test("deduplicates by domain (max 2 per domain)", () => {
    const results = [
      makeResult({ url: "https://example.com/a", title: "Article A with enough chars" }),
      makeResult({ url: "https://example.com/b", title: "Article B with enough chars" }),
      makeResult({ url: "https://example.com/c", title: "Article C with enough chars" }),
      makeResult({ url: "https://other.com/d", title: "Article D with enough chars" }),
    ];
    const ranked = rank(results);
    const exampleCount = ranked.filter((r) => r.url.includes("example.com")).length;
    expect(exampleCount).toBeLessThanOrEqual(2);
  });

  test("respects topN limit", () => {
    const results = Array.from({ length: 20 }, (_, i) =>
      makeResult({
        url: `https://site${i}.com/page`,
        title: `Article ${i} with a long enough title`,
      })
    );
    const ranked = rank(results, 5);
    expect(ranked).toHaveLength(5);
  });

  test("handles www prefix in domain dedup", () => {
    const results = [
      makeResult({ url: "https://www.example.com/a", title: "With www prefix article" }),
      makeResult({ url: "https://example.com/b", title: "Without www prefix article" }),
      makeResult({ url: "https://example.com/c", title: "Third from same domain here" }),
    ];
    const ranked = rank(results);
    const exampleCount = ranked.filter((r) => r.url.includes("example.com")).length;
    expect(exampleCount).toBeLessThanOrEqual(2);
  });

  test("returns empty for all low-quality results", () => {
    const results = [
      makeResult({ snippet: "tiny", url: "https://a.com/x" }),
      makeResult({ snippet: "", url: "https://b.com/x" }),
    ];
    const ranked = rank(results);
    expect(ranked).toHaveLength(0);
  });
});
