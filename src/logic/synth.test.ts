import { afterEach, describe, expect, it } from "bun:test";
import { synthesizeAnswer } from "./synth";
import type { SearchResult } from "./brave";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const sampleResults: SearchResult[] = [
  {
    title: "Queryx release notes",
    url: "https://example.com/release",
    snippet: "Queryx ships improvements to ranking and synthesis.",
    domain: "example.com",
    publishedAt: "2026-03-02T00:00:00Z",
  },
];

describe("synth.ts", () => {
  it("clamps confidence to 0-1 and uses API token counts", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Queryx added ranking and caching updates.",
                  confidence: 1.7,
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 42,
            completion_tokens: 13,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    const output = await synthesizeAnswer("What changed in Queryx?", sampleResults, {
      apiKey: "openai_test_key",
    });

    expect(output.confidence).toBe(1);
    expect(output.tokens.in).toBe(42);
    expect(output.tokens.out).toBe(13);
    expect(output.model).toBe("gpt-4o-mini");
  });

  it("falls back to estimated tokens when usage is absent", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "No definitive update found.",
                  confidence: -2,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;

    const output = await synthesizeAnswer("Unknown query", sampleResults, {
      apiKey: "openai_test_key",
    });

    expect(output.confidence).toBe(0);
    expect(output.tokens.in).toBeGreaterThan(0);
    expect(output.tokens.out).toBeGreaterThan(0);
  });
});