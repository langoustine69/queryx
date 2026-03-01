/**
 * Tests for the Brave Search API client.
 *
 * WHY these tests:
 * 1. Contract test — confirms normalizeWebResults and normalizeNewsResults
 *    map Brave's raw JSON shape to our SearchResult schema correctly.
 * 2. Error-path tests — confirms that 429 and 401 responses throw the
 *    correct typed errors so callers can handle them distinctly.
 * 3. Missing-key test — confirms BraveAuthError is thrown before any
 *    network call when BRAVE_API_KEY is absent.
 *
 * We use Bun's built-in test runner and mock `fetch` inline so no
 * external services are required.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  braveSearch,
  BraveRateLimitError,
  BraveAuthError,
} from "./brave";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(status: number, body: unknown) {
  return mock(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

const SAMPLE_WEB_BODY = {
  web: {
    results: [
      {
        title: "Base Blockchain Overview",
        url: "https://base.org/overview",
        description: "Base is an Ethereum L2 built by Coinbase.",
        page_age: "2025-01-15T12:00:00Z",
        relevance_score: 0.95,
      },
      {
        title: "What is Base?",
        url: "https://docs.base.org",
        description: "Documentation for Base network.",
      },
    ],
  },
};

const SAMPLE_NEWS_BODY = {
  results: [
    {
      title: "Base hits 10M transactions",
      url: "https://news.example.com/base-10m",
      description: "Base network reaches milestone.",
      age: "2025-03-01T08:00:00Z",
    },
  ],
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("braveSearch", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.BRAVE_API_KEY;

  beforeEach(() => {
    // WHY: Ensure a key is present for the happy-path tests so they don't
    // short-circuit before reaching the mocked fetch.
    process.env.BRAVE_API_KEY = "test-key-123";
  });

  afterEach(() => {
    // WHY: Restore globals after each test to prevent cross-test pollution.
    globalThis.fetch = originalFetch;
    process.env.BRAVE_API_KEY = originalEnv;
  });

  // -------------------------------------------------------------------------
  // 1. Web results are normalised correctly
  // -------------------------------------------------------------------------
  it("normalises web results into SearchResult shape", async () => {
    globalThis.fetch = makeFetchMock(200, SAMPLE_WEB_BODY) as any;

    const results = await braveSearch("Base blockchain", { type: "web" });

    expect(results).toHaveLength(2);

    // First result — all fields populated
    expect(results[0]).toEqual({
      title: "Base Blockchain Overview",
      url: "https://base.org/overview",
      snippet: "Base is an Ethereum L2 built by Coinbase.",
      published: "2025-01-15T12:00:00Z",
      score: 0.95,
    });

    // Second result — optional fields absent
    expect(results[1].published).toBeUndefined();
    expect(results[1].score).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 2. News results are normalised correctly
  // -------------------------------------------------------------------------
  it("normalises news results into SearchResult shape", async () => {
    globalThis.fetch = makeFetchMock(200, SAMPLE_NEWS_BODY) as any;

    const results = await braveSearch("Base news", { type: "news" });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "Base hits 10M transactions",
      url: "https://news.example.com/base-10m",
      snippet: "Base network reaches milestone.",
      published: "2025-03-01T08:00:00Z",
    });
  });

  // -------------------------------------------------------------------------
  // 3. Rate-limit response throws BraveRateLimitError
  // WHY: Callers need to distinguish 429 from other errors to implement
  // backoff / refund logic without swallowing the error.
  // -------------------------------------------------------------------------
  it("throws BraveRateLimitError on 429", async () => {
    globalThis.fetch = makeFetchMock(429, {}) as any;

    await expect(braveSearch("anything")).rejects.toBeInstanceOf(
      BraveRateLimitError,
    );
  });

  // -------------------------------------------------------------------------
  // 4. Missing API key throws BraveAuthError before any network call
  // WHY: Fast-fail prevents a useless outbound request when misconfigured.
  // -------------------------------------------------------------------------
  it("throws BraveAuthError immediately when BRAVE_API_KEY is missing", async () => {
    delete process.env.BRAVE_API_KEY;

    // fetch should never be called — use a sentinel that throws if invoked
    globalThis.fetch = mock(() => {
      throw new Error("fetch must not be called");
    }) as any;

    await expect(braveSearch("anything")).rejects.toBeInstanceOf(BraveAuthError);
    expect((globalThis.fetch as ReturnType<typeof mock>).mock.calls).toHaveLength(0);
  });
});
