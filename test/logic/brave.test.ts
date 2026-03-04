import { afterEach, describe, expect, it } from "bun:test";
import { BraveApiError, searchBrave } from "../../src/logic/brave";

const originalFetch = globalThis.fetch;

function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response
): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    return handler(input, init);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("logic/brave", () => {
  it("normalises Brave response into SearchResult[] and passes freshness param", async () => {
    let calledUrl = "";

    mockFetch((input) => {
      calledUrl = typeof input === "string" ? input : input.toString();
      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Queryx launch notes",
                url: "https://www.example.com/blog/queryx",
                description: "Queryx data layer is now live.",
                page_age: "2026-03-03T12:00:00Z"
              }
            ]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    const results = await searchBrave("queryx", {
      apiKey: "test-api-key",
      freshness: "week"
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "Queryx launch notes",
      url: "https://www.example.com/blog/queryx",
      snippet: "Queryx data layer is now live.",
      domain: "example.com",
      source: "brave"
    });
    expect(results[0].publishedAt).toBe("2026-03-03T12:00:00.000Z");

    const url = new URL(calledUrl);
    expect(url.searchParams.get("freshness")).toBe("pw");
    expect(url.searchParams.get("q")).toBe("queryx");
  });

  it("throws BraveApiError on rate limit with retry metadata", async () => {
    mockFetch(() => {
      return new Response(JSON.stringify({ error: { message: "Too many requests" } }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "15"
        }
      });
    });

    try {
      await searchBrave("queryx", { apiKey: "test-api-key" });
      throw new Error("Expected searchBrave to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BraveApiError);
      const typed = error as BraveApiError;
      expect(typed.status).toBe(429);
      expect(typed.code).toBe("RATE_LIMITED");
      expect(typed.retryAfterSeconds).toBe(15);
    }
  });
});