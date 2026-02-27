import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { synthesise, scoreConfidence } from "../../src/logic/synth";
import type { SearchResult } from "../../src/logic/brave";

const originalFetch = globalThis.fetch;

function mockOpenAI(answer: string, tokens = { prompt_tokens: 100, completion_tokens: 50 }) {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: answer } }],
          usage: tokens,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ),
  ) as any;
}

const sampleSources: SearchResult[] = [
  {
    title: "Fed Holds Rates",
    url: "https://reuters.com/fed",
    snippet: "The Federal Reserve held interest rates steady at 4.25% in January 2026, citing persistent inflation concerns and strong labor market data.",
    published: "2026-01-29",
  },
  {
    title: "Rate Decision Analysis",
    url: "https://bloomberg.com/fed",
    snippet: "The Federal Reserve maintained rates as expected. Analysts predict the first rate cut may come in Q3 2026 if inflation data improves.",
    published: "2026-01-30",
  },
];

describe("scoreConfidence", () => {
  it("returns 0 for empty sources", () => {
    expect(scoreConfidence([])).toBe(0);
  });

  it("returns higher score for more sources", () => {
    const few = scoreConfidence([sampleSources[0]]);
    const more = scoreConfidence(sampleSources);
    expect(more).toBeGreaterThan(few);
  });

  it("is clamped between 0 and 1", () => {
    const score = scoreConfidence(sampleSources);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("gives recency bonus when published dates exist", () => {
    const withDates = scoreConfidence(sampleSources);
    const withoutDates = scoreConfidence([
      { title: "Test", url: "https://test.com", snippet: "A short snippet for testing" },
    ]);
    expect(withDates).toBeGreaterThan(withoutDates);
  });

  it("considers source agreement via snippet overlap", () => {
    const agreeing: SearchResult[] = [
      { title: "A", url: "https://a.com", snippet: "The Federal Reserve held rates steady at 4.25 percent" },
      { title: "B", url: "https://b.com", snippet: "The Federal Reserve held rates steady at 4.25 percent" },
    ];
    const disagreeing: SearchResult[] = [
      { title: "A", url: "https://a.com", snippet: "The Federal Reserve held rates steady at 4.25 percent" },
      { title: "B", url: "https://b.com", snippet: "Cryptocurrency markets surged overnight on whale activity" },
    ];
    expect(scoreConfidence(agreeing)).toBeGreaterThan(scoreConfidence(disagreeing));
  });
});

describe("synthesise", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws without OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    expect(synthesise("test", sampleSources)).rejects.toThrow("OPENAI_API_KEY is required");
  });

  it("returns answer with confidence and tokens", async () => {
    mockOpenAI("The Fed held rates at 4.25%.", { prompt_tokens: 312, completion_tokens: 187 });
    const result = await synthesise("fed rate", sampleSources);
    expect(result.answer).toBe("The Fed held rates at 4.25%.");
    expect(result.tokens.in).toBe(312);
    expect(result.tokens.out).toBe(187);
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("sends correct prompt format to OpenAI", async () => {
    mockOpenAI("answer");
    await synthesise("test query", sampleSources);
    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].content).toContain("test query");
    expect(body.messages[1].content).toContain("reuters.com");
  });
});
