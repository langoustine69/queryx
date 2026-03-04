import { describe, expect, it } from "bun:test";
import { rankResults } from "../src/logic/rank";
import type { SearchResult } from "../src/logic/types";

describe("rank.ts", () => {
  it("deduplicates by canonical URL and caps results per domain", () => {
    const now = new Date("2026-03-04T00:00:00.000Z");
    const input: SearchResult[] = [
      {
        title: "A1",
        url: "https://example.com/post?id=1&utm_source=x",
        snippet: "A long, useful snippet with enough context to pass quality thresholds.",
        domain: "example.com",
        publishedAt: "2026-03-03T00:00:00.000Z",
      },
      {
        title: "A1 duplicate canonical",
        url: "https://example.com/post?id=1&utm_source=y",
        snippet: "Duplicate URL once utm params are removed.",
        domain: "example.com",
        publishedAt: "2026-03-02T00:00:00.000Z",
      },
      {
        title: "A2",
        url: "https://example.com/post-2",
        snippet: "Another strong snippet that should be retained.",
        domain: "example.com",
        publishedAt: "2026-03-01T00:00:00.000Z",
      },
      {
        title: "A3",
        url: "https://example.com/post-3",
        snippet: "Would exceed the per-domain cap.",
        domain: "example.com",
        publishedAt: "2026-02-28T00:00:00.000Z",
      },
      {
        title: "B1",
        url: "https://other.net/news",
        snippet: "Different domain with quality content and unique perspective.",
        domain: "other.net",
        publishedAt: "2026-03-02T00:00:00.000Z",
      },
    ];

    const ranked = rankResults(input, {
      now,
      maxPerDomain: 2,
      minQualityScore: 0.1,
    });

    const uniqueUrls = new Set(ranked.map((r) => r.url));
    const fromExample = ranked.filter((r) => r.domain === "example.com");

    expect(uniqueUrls.size).toBe(ranked.length);
    expect(fromExample.length).toBeLessThanOrEqual(2);
  });

  it("boosts newer results when quality is similar", () => {
    const now = new Date("2026-03-04T00:00:00.000Z");

    const input: SearchResult[] = [
      {
        title: "Fresh result",
        url: "https://fresh.io/a",
        snippet: "Detailed and high-quality context for the same topic.",
        domain: "fresh.io",
        publishedAt: "2026-03-03T00:00:00.000Z",
      },
      {
        title: "Old result",
        url: "https://archive.io/b",
        snippet: "Detailed and high-quality context for the same topic.",
        domain: "archive.io",
        publishedAt: "2024-01-01T00:00:00.000Z",
      },
    ];

    const ranked = rankResults(input, {
      now,
      maxPerDomain: 2,
      minQualityScore: 0.1,
    });

    expect(ranked[0].title).toBe("Fresh result");
    expect(ranked[0].recencyScore).toBeGreaterThan(ranked[1].recencyScore);
  });
});