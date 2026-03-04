import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { synthesize } from "../src/logic/synth";
import type { SearchResult } from "../src/logic/types";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;

const sampleResults: SearchResult[] = [
  {
    title: "Bun 1.2 Released",
    url: "https://example.com/bun-release",
    snippet: "Bun ships speed improvements and runtime updates.",
    domain: "example.com",
    publishedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    title: "Runtime Benchmarks",
    url: "https://another.com/bench",
    snippet: "Independent benchmark data for modern runtimes.",
    domain: "another.com",
    publishedAt: "2026-02-28T00:00:00.000Z",
  },
];

describe("synth.ts", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
  });

  afterEach(() => {
    (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it("clamps confidence and uses returned token usage", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Bun delivers runtime and tooling improvements.",
                  confidence: 1.8,
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 25,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const output = await synthesize("What changed in Bun?", sampleResults);

    expect(output.answer).toContain("Bun");
    expect(output.confidence).toBe(1);
    expect(output.tokens).toEqual({ in: 120, out: 25 });
    expect(output.model).toBe("gpt-4o-mini");
  });

  it("estimates tokens when usage is missing and keeps confidence in range", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      return new Response(
        JSON.stringify({
          model: "gpt-4o-mini",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Evidence indicates improved runtime performance and DX updates.",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const output = await synthesize("Summarize the updates", sampleResults);

    expect(output.tokens.in).toBeGreaterThan(0);
    expect(output.tokens.out).toBeGreaterThan(0);
    expect(output.confidence).toBeGreaterThanOrEqual(0);
    expect(output.confidence).toBeLessThanOrEqual(1);
  });
});