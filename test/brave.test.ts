import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { BraveApiError, BraveRateLimitError, normalizeBraveResponse, searchBrave } from "../src/logic/brave";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.BRAVE_API_KEY;

describe("brave.ts", () => {
  beforeEach(() => {
    process.env.BRAVE_API_KEY = "test-brave-key";
  });

  afterEach(() => {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.BRAVE_API_KEY;
    } else {
      process.env.BRAVE_API_KEY = originalApiKey;
    }
  });

  it("normalises results and maps freshness parameter", async () => {
    let requestedUrl = "";

    (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Example Result",
                url: "https://www.example.com/post",
                description: "Useful snippet",
                page_age: "2026-03-03T12:00:00.000Z",
              },
              {
                title: "Invalid Row",
                url: "not-a-url",
                description: "Should be filtered",
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const results = await searchBrave("  test query  ", { freshness: "week" });

    expect(requestedUrl).toContain("freshness=pw");
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe("example.com");
    expect(results[0].snippet).toBe("Useful snippet");
    expect(results[0].source).toBe("brave");
  });

  it("throws rate-limit errors with retry-after metadata", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      return new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
        status: 429,
        headers: { "Retry-After": "12" },
      });
    }) as typeof fetch;

    let thrown: unknown;
    try {
      await searchBrave("rate limited");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(BraveRateLimitError);
    expect((thrown as BraveRateLimitError).retryAfterSeconds).toBe(12);
  });

  it("throws API errors for non-429 failures", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      return new Response(JSON.stringify({ message: "Internal server error" }), {
        status: 500,
      });
    }) as typeof fetch;

    let thrown: unknown;
    try {
      await searchBrave("server fail");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(BraveApiError);
    expect((thrown as BraveApiError).status).toBe(500);
  });

  it("normalise helper returns empty array safely", () => {
    expect(normalizeBraveResponse({})).toEqual([]);
  });
});