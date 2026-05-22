import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { braveSearch, BraveApiError, BraveRateLimitError, BraveAuthError } from "../../src/logic/brave";

const originalFetch = globalThis.fetch;

function mockFetch(response: any, status = 200) {
  globalThis.fetch = mock(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(response),
    } as Response)
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.BRAVE_API_KEY = "test-key";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("braveSearch", () => {
  test("returns normalized SearchResult[] for web search", async () => {
    mockFetch({
      web: {
        results: [
          {
            title: "Test Result",
            url: "https://example.com/article",
            description: "A test snippet about the query.",
            page_age: "2 hours ago",
          },
          {
            title: "Another Result",
            url: "https://test.com/page",
            description: "Another snippet.",
          },
        ],
      },
    });

    const results = await braveSearch("test query");
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Test Result");
    expect(results[0].snippet).toBe("A test snippet about the query.");
    expect(results[0].published).toBe("2 hours ago");
    expect(results[1].published).toBeUndefined();
  });

  test("returns news results when type is news", async () => {
    mockFetch({
      results: [
        {
          title: "Breaking News",
          url: "https://news.com/breaking",
          description: "Something happened.",
          age: "1 hour ago",
        },
      ],
    });

    const results = await braveSearch("news query", { type: "news" });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Breaking News");
    expect(results[0].published).toBe("1 hour ago");
  });

  test("handles empty results", async () => {
    mockFetch({ web: { results: [] } });
    const results = await braveSearch("obscure query");
    expect(results).toEqual([]);
  });

  test("handles missing web.results gracefully", async () => {
    mockFetch({ web: {} });
    const results = await braveSearch("query");
    expect(results).toEqual([]);
  });

  test("throws BraveRateLimitError on 429", async () => {
    mockFetch({}, 429);
    try {
      await braveSearch("query");
      expect(true).toBe(false); // should not reach
    } catch (e: any) {
      expect(e).toBeInstanceOf(BraveRateLimitError);
      expect(e.statusCode).toBe(429);
    }
  });

  test("throws BraveAuthError on 401", async () => {
    mockFetch({}, 401);
    try {
      await braveSearch("query");
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(BraveAuthError);
      expect(e.statusCode).toBe(401);
    }
  });

  test("throws BraveApiError on generic error", async () => {
    mockFetch({}, 500);
    try {
      await braveSearch("query");
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(BraveApiError);
      expect(e.statusCode).toBe(500);
    }
  });

  test("throws when BRAVE_API_KEY is missing", async () => {
    delete process.env.BRAVE_API_KEY;
    try {
      await braveSearch("query");
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e).toBeInstanceOf(BraveAuthError);
    }
  });

  test("passes freshness and count params", async () => {
    mockFetch({ web: { results: [] } });
    await braveSearch("query", { freshness: "day", count: 5 });

    const callArgs = (globalThis.fetch as any).mock.calls[0];
    const url = callArgs[0] as string;
    expect(url).toContain("freshness=day");
    expect(url).toContain("count=5");
  });
});
