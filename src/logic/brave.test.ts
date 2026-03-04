import { afterEach, describe, expect, it } from "bun:test";
import {
  BraveApiError,
  BraveRateLimitError,
  normalizeBraveResponse,
  searchBrave,
} from "./brave";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("brave.ts", () => {
  it("normalizes Brave response into SearchResult[]", () => {
    const results = normalizeBraveResponse({
      web: {
        results: [
          {
            title: "Example Title",
            url: "https://www.example.com/path",
            description: "Example description",
            profile: { name: "Example Source" },
            published_at: "2026-03-01T12:00:00Z",
          },
          {
            title: "Second Result",
            url: "https://docs.example.org/page",
            snippet: "Second snippet",
          },
        ],
      },
    });

    expect(results.length).toBe(2);
    expect(results[0]).toEqual({
      title: "Example Title",
      url: "https://www.example.com/path",
      snippet: "Example description",
      domain: "example.com",
      source: "Example Source",
      publishedAt: "2026-03-01T12:00:00.000Z",
    });
    expect(results[1].domain).toBe("docs.example.org");
  });

  it("throws BraveRateLimitError on 429", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "too many requests" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "7",
        },
      })) as typeof fetch;

    await expect(
      searchBrave("test query", { apiKey: "brave_test_key" })
    ).rejects.toBeInstanceOf(BraveRateLimitError);
  });

  it("throws BraveApiError on non-429 error", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: "server error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;

    await expect(
      searchBrave("test query", { apiKey: "brave_test_key" })
    ).rejects.toBeInstanceOf(BraveApiError);
  });
});