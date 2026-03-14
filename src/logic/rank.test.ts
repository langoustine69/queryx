import { describe, expect, it } from "bun:test";
import { rankSearchResults } from "./rank";
import type { SearchResult } from "./brave";

describe("rank.ts", () => {
  it("deduplicates and enforces max 2 results per domain", () => {
    const input: SearchResult[] = [
      {
        title: "A complete guide to Queryx",
        url: "https://example.com/guide?utm_source=test",
        snippet: "Long and useful article about using Queryx effectively in production.",
        domain: "example.com",
        publishedAt: "2026-03-01T00:00:00Z",
      },
      {
        title: "A complete guide to Queryx",
        url: "https://example.com/guide",
        snippet: "Duplicate of the same article with tracking params removed.",
        domain: "example.com",
        publishedAt: "2026-03-01T00:00:00Z",
      },
      {
        title: "Queryx architecture deep dive",
        url: "https://example.com/architecture",
        snippet: "Detailed architecture decisions and implementation details.",
        domain: "example.com",
        publishedAt: "2026-02-20T00:00:00Z",
      },
      {
        title: "Queryx API quickstart",
        url: "https://example.com/quickstart",
        snippet: "Quickstart tutorial for integrating Queryx APIs.",
        domain: "example.com",
        publishedAt: "2026-02-15T00:00:00Z",
      },
      {
        title: "Independent review of Queryx",
        url: "https://another.com/review",
        snippet: "Third-party review with practical examples and benchmark notes.",
        domain: "another.com",
        publishedAt: "2026-02-28T00:00:00Z",
      },
    ];

    const ranked = rankSearchResults(input, {
      maxPerDomain: 2,
      maxResults: 10,
      now: new Date("2026-03-04T00:00:00Z"),
    });

    const exampleCount = ranked.filter((r) => r.domain === "example.com").length;
    expect(exampleCount).toBe(2);

    const urls = ranked.map((r) => r.url);
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);
  });

  it("boosts newer content over older content", () => {
    const input: SearchResult[] = [
      {
        title: "Queryx release today",
        url: "https://fresh.dev/queryx-release",
        snippet: "Today's update includes major improvements and migration notes.",
        domain: "fresh.dev",
        publishedAt: "2026-03-03T12:00:00Z",
      },
      {
        title: "Queryx release notes archive",
        url: "https://old.dev/queryx-archive",
        snippet: "Historical notes from previous years and legacy behavior.",
        domain: "old.dev",
        publishedAt: "2022-01-01T00:00:00Z",
      },
    ];

    const ranked = rankSearchResults(input, {
      maxResults: 10,
      now: new Date("2026-03-04T00:00:00Z"),
    });

    expect(ranked[0]?.url).toBe("https://fresh.dev/queryx-release");
  });

  it("filters low-quality results", () => {
    const input: SearchResult[] = [
      {
        title: "ok",
        url: "https://spam.dev/a",
        snippet: "tiny",
        domain: "spam.dev",
      },
      {
        title: "Useful Queryx guide for developers",
        url: "https://good.dev/guide",
        snippet:
          "This guide explains setup, ranking behavior, and synthesis output patterns in depth.",
        domain: "good.dev",
      },
    ];

    const ranked = rankSearchResults(input, { maxResults: 10 });
    expect(ranked.length).toBe(1);
    expect(ranked[0].domain).toBe("good.dev");
  });
});