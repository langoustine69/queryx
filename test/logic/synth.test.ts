import { afterEach, describe, expect, it } from "bun:test";
import type { SearchResult } from "../../src/logic/brave";
import { synthesize } from "../../src/logic/synth";

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

describe("logic/synth", () => {
  const sampleResults: SearchResult[] = [
    {
      title: "Queryx architecture",
      url: "https://docs.queryx.ai/architecture",
      snippet: "Queryx uses Brave search retrieval, source ranking, and synthesis over curated snippets.",
      domain: "docs.queryx.ai",
      publishedAt: "2026-03-03T10:00:00.000Z",
      source: "brave"
    },
    {
      title: "Queryx API changes",
      url: "https://blog.queryx.ai/api-update",
      snippet: "The latest update adds cache TTL controls and confidence-calibrated answer synthesis.",
      domain: "blog.queryx.ai",
      publishedAt: "2026-03-02T10:00:00.000Z",
      source: "brave"
    }
  ];

  it("clamps confidence and uses explicit token usage from API response", async () => {
    mockFetch((_input, init) => {
      expect(init?.method).toBe("POST");

      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: "{\"answer\":\"Queryx combines search, ranking, caching, and concise synthesis.\",\"confidence\":1.7}"
              }
            }
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 32
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    const output = await synthesize("How does Queryx work?", sampleResults, {
      apiKey: "test-openai-key"
    });

    expect(output.answer).toContain("Queryx");
    expect(output.confidence).toBe(1);
    expect(output.tokens).toEqual({ in: 120, out: 32 });
    expect(output.model).toBe("gpt-4o-mini");
  });

  it("estimates tokens when usage is absent and computes confidence within [0,1]", async () => {
    mockFetch(() => {
      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: "{\"answer\":\"Queryx aggregates multiple sources and returns concise factual output.\"}"
              }
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });

    const output = await synthesize("Queryx summary", sampleResults, {
      apiKey: "test-openai-key"
    });

    expect(output.tokens.in).toBeGreaterThan(0);
    expect(output.tokens.out).toBeGreaterThan(0);
    expect(output.confidence).toBeGreaterThanOrEqual(0);
    expect(output.confidence).toBeLessThanOrEqual(1);
  });
});