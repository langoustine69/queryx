import { describe, expect, test } from "bun:test";
import type { SearchResult } from "../src/logic/brave";
import { rankResults } from "../src/logic/rank";

describe("rank.ts", () => {
  test("deduplicates to max 2 results per domain", () => {
    const input: SearchResult[] = [
      {
        title: "A1",
        url: "https://a.com/1",
        snippet: "Detailed explanation about queryx ranking system and internals.",
        sourceDomain: "a.com",
        publishedAt: "2026-03-03T00:00:00.000Z",
      },
      {
        title: "A2",
        url: "https://a.com/2",
        snippet: "Another detailed explanation about queryx ranking and scoring.",
        sourceDomain: "a.com",
        publishedAt: "2026-03-02T00:00:00.000Z",
      },
      {
        title: "A3",
        url: "https://a.com/3",
        snippet: "Third article on same domain with enough content to be valid.",
        sourceDomain: "a.com",
        publishedAt: "2026-03-01T00:00:00.000Z",
      },
      {
        title: "B1",
        url: "https://b.com/1",
        snippet: "Strong alternative source from another domain with good details.",
        sourceDomain: "b.com",
        publishedAt: "2026-03-01T00:00:00.000Z",
      },
    ];

    const ranked = rankResults(input, { maxPerDomain: 2, limit: 10, now: new Date("2026-03-04T00:00:00.000Z") });
    const aCount = ranked.filter((r) => r.sourceDomain === "a.com").length;

    expect(aCount).toBe(2);
  });

  test("applies recency boost", () => {
    const input: SearchResult[] = [
      {
        title: "Older source",
        url: "https://old.com/post",
        snippet: "Comprehensive but old content about queryx architecture and usage.",
        sourceDomain: "old.com",
        publishedAt: "2020-01-01T00:00:00.000Z",
      },
      {
        title: "Recent source",
        url: "https://new.com/post",
        snippet: "Comprehensive and recent content about queryx architecture and usage.",
        sourceDomain: "new.com",
        publishedAt: "2026-03-03T00:00:00.000Z",
      },
    ];

    const ranked = rankResults(input, { now: new Date("2026-03-04T00:00:00.000Z") });

    expect(ranked[0]?.sourceDomain).toBe("new.com");
    expect(ranked[0]?.score > ranked[1]?.score).toBe(true);
  });
});