import { describe, expect, test } from "bun:test";
import {
  ErrorEnvelopeSchema,
  SearchResponseSchema,
  searchResponseJsonSchema,
} from "../../src/schemas";

describe("API schemas", () => {
  test("validates the paid search response contract", () => {
    const parsed = SearchResponseSchema.parse({
      query: "fed rate decision",
      answer: "The Fed held rates steady.",
      sources: [
        {
          title: "Fed decision",
          url: "https://example.com/fed",
          snippet: "The Federal Reserve held rates steady.",
          published: "2026-05-11T00:00:00.000Z",
        },
      ],
      confidence: 0.87,
      freshness: {
        fetchedAt: "2026-05-11T04:00:00.000Z",
        resultsAge: "4h",
      },
      model: "queryx-fast-v1",
      tokens: { in: 312, out: 187 },
    });

    expect(parsed.sources[0].url).toBe("https://example.com/fed");
  });

  test("rejects confidence values outside the 0..1 range", () => {
    expect(() =>
      SearchResponseSchema.parse({
        query: "x",
        answer: "x",
        sources: [],
        confidence: 1.2,
        freshness: { fetchedAt: new Date().toISOString(), resultsAge: "0m" },
        model: "queryx-fast-v1",
        tokens: { in: 1, out: 1 },
      }),
    ).toThrow();
  });

  test("exports Zod v4 JSON schema for the response", () => {
    expect(searchResponseJsonSchema.type).toBe("object");
    expect(searchResponseJsonSchema.properties).toHaveProperty("freshness");
    expect(searchResponseJsonSchema.properties).toHaveProperty("confidence");
  });

  test("validates structured error envelopes", () => {
    const parsed = ErrorEnvelopeSchema.parse({
      error: {
        code: "PAYMENT_REQUIRED",
        message: "x402 payment is required",
      },
    });

    expect(parsed.error.code).toBe("PAYMENT_REQUIRED");
  });
});
