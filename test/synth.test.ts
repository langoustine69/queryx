import { afterEach, describe, expect, test } from "bun:test";
import type { SearchResult } from "../src/logic/brave";
import { synthesize } from "../src/logic/synth";

const originalFetch = globalThis.fetch;

const sampleResults: SearchResult[] = [
  {
    title: "Queryx documentation",
    url: "https://docs.example.com/queryx",
    snippet: "Queryx is a search API with ranking, synthesis, and cache support.",
    sourceDomain: "docs.example.com",
    publishedAt: "2026-03-01T00:00:00.000Z",
    language: "en",
  },
];

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("synth.ts", () => {
  test("clamps confidence and returns token usage", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini-2026",
          usage: {
            prompt_tokens: 120,
            completion_tokens: 45,
          },
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Queryx combines retrieval and synthesis for concise responses.",
                  confidence: 1.7,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await synthesize("What is Queryx?", sampleResults, { apiKey: "test-key" });

    expect(result.confidence).toBe(1);
    expect(result.tokens.in).toBe(120);
    expect(result.tokens.out).toBe(45);
    expect(result.model).toBe("gpt-4o-mini-2026");
  });

  test("estimates token usage when upstream usage is missing", async () => {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "There is not enough information to fully answer this.",
                  confidence: -0.5,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await synthesize("unknown", sampleResults, { apiKey: "test-key" });

    expect(result.confidence).toBe(0);
    expect(result.tokens.in > 0).toBe(true);
    expect(result.tokens.out > 0).toBe(true);
  });
});