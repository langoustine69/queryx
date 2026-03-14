import { afterEach, describe, expect, test } from "bun:test";
import { BraveClientError, searchBrave } from "../src/logic/brave";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("brave.ts", () => {
  test("normalises Brave response into SearchResult[] and maps freshness", async () => {
    let capturedUrl = "";

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      capturedUrl = typeof input === "string" ? input : input.toString();

      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Queryx Launch",
                url: "https://example.com/post",
                description: "Queryx ships fast and clean results.",
                page_age: "2026-03-01T12:00:00.000Z",
                language: "en",
              },
              {
                title: "Invalid URL result",
                url: "not-a-url",
                description: "This should be filtered out",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const results = await searchBrave("  Queryx  ", {
      apiKey: "test-key",
      freshness: "week",
      count: 5,
    });

    expect(capturedUrl.includes("freshness=pw")).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0]?.title).toBe("Queryx Launch");
    expect(results[0]?.sourceDomain).toBe("example.com");
    expect(results[0]?.publishedAt).toBe("2026-03-01T12:00:00.000Z");
  });

  test("throws rate limit error with retry-after", async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: { detail: "Rate limit exceeded" } }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "12",
        },
      });
    }) as typeof fetch;

    let thrown: unknown;
    try {
      await searchBrave("queryx", { apiKey: "test-key" });
    } catch (error) {
      thrown = error;
    }

    expect(thrown instanceof BraveClientError).toBe(true);
    const err = thrown as BraveClientError;
    expect(err.code).toBe("rate_limited");
    expect(err.status).toBe(429);
    expect(err.retryAfterSeconds).toBe(12);
  });
});