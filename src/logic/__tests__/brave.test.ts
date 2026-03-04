import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { BraveApiError, normalizeBraveResponse, searchBrave } from "../brave";

const originalFetch = globalThis.fetch;

describe("brave.ts", () => {
  beforeEach(() => {
    process.env.BRAVE_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.BRAVE_API_KEY;
  });

  it("normalises Brave response into SearchResult[]", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "First result",
                url: "https://news.example.com/story?utm=1",
                description: "This is the first test result description.",
                page_age: "2026-02-28T08:00:00Z",
                meta_url: { hostname: "news.example.com" },
              },
              {
                title: "Second result",
                url: "https://blog.example.org/post",
                description: "This is the second test result description.",
              },
            ],
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    const results = await searchBrave("queryx", {
      endpoint: "https://github.com/langoustine69/queryx",
    });

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("First result");
    expect(results[0].domain).toBe("news.example.com");
    expect(results[0].publishedAt).toBe("2026-02-28T08:00:00.000Z");
    expect(results[1].domain).toBe("blog.example.org");
  });

  it("throws typed rate-limit errors", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "Rate limited",
            code: "too_many_requests",
          },
        }),
        {
          status: 429,
          headers: {
            "retry-after": "9",
          },
        },
      )) as typeof fetch;

    try {
      await searchBrave("queryx", {
        endpoint: "https://github.com/langoustine69/queryx",
      });
      throw new Error("Expected searchBrave to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BraveApiError);
      const typed = error as BraveApiError;
      expect(typed.status).toBe(429);
      expect(typed.code).toBe("RATE_LIMITED");
      expect(typed.retryAfterSeconds).toBe(9);
    }
  });

  it("handles malformed payloads safely", () => {
    const results = normalizeBraveResponse({ web: { results: "not-an-array" } });
    expect(results).toEqual([]);
  });
});