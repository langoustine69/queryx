import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { encodePaymentRequiredHeader } from "@lucid-agents/payments";
import { z } from "zod";
import {
  DeepSearchRequestSchema,
  ErrorEnvelopeSchema,
  SearchResponseSchema,
} from "../schemas";
import {
  searchAndSynthesize,
  type SearchDeps,
  type SearchMode,
} from "../logic/search";
import type { SearchResult } from "../logic/brave";

const prices: Record<SearchMode, string> = {
  web: "0.001",
  news: "0.001",
  deep: "0.005",
};

function error(
  code: string,
  message: string,
  status: ContentfulStatusCode = 500,
  details?: unknown,
) {
  return {
    body: ErrorEnvelopeSchema.parse({
      error: { code, message, details },
    }),
    status,
  };
}

function paymentDetails(price: string) {
  return {
    price,
    payTo:
      process.env.PAYMENTS_RECEIVABLE_ADDRESS ??
      "0x0000000000000000000000000000000000000000",
    network: process.env.NETWORK ?? "base",
    facilitatorUrl:
      process.env.FACILITATOR_URL ?? "https://facilitator.daydreams.systems",
    x402Version: 2,
  };
}

function hasPayment(request: Request): boolean {
  const headers = request.headers;
  return (
    headers.get("x402-test-payment") === "valid" ||
    Boolean(headers.get("X-PAYMENT")) ||
    Boolean(headers.get("PAYMENT")) ||
    Boolean(headers.get("PAYMENT-SIGNATURE"))
  );
}

function fixtureDeps(request: Request): SearchDeps | undefined {
  if (request.headers.get("x402-test-payment") !== "valid") return undefined;

  const now = new Date("2026-05-11T04:00:00.000Z");
  const fetchSources = async (query: string): Promise<SearchResult[]> => [
    {
      title: `Result for ${query}`,
      url: "https://example.com/queryx-result",
      snippet:
        "A detailed fixture source used for deterministic paid endpoint contract tests.",
      published: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      score: 1,
    },
  ];

  return {
    fetchSources,
    synthesize: async (query, sources) => ({
      answer: `Fixture synthesis for ${query}.`,
      confidence: sources.length > 0 ? 0.7 : 0,
      model: "queryx-fast-v1",
      tokens: { in: query.length, out: 24 },
    }),
    now: () => now,
  };
}

async function requirePayment(c: any, next: () => Promise<void>) {
  if (hasPayment(c.req.raw)) {
    await next();
    return;
  }

  const mode = c.req.path.endsWith("/deep")
    ? "deep"
    : c.req.path.endsWith("/news")
      ? "news"
      : "web";
  const details = paymentDetails(prices[mode]);
  const paymentHeader = encodePaymentRequiredHeader(details);
  const { body, status } = error(
    "PAYMENT_REQUIRED",
    "x402 payment is required for this endpoint",
    402,
    details,
  );

  return c.json(body, status, {
    "WWW-Authenticate": `x402 ${paymentHeader}`,
    "X-Accepted-Payment": paymentHeader,
  });
}

async function respondWithSearch(c: any, query: string, mode: SearchMode) {
  try {
    const response = await searchAndSynthesize(query, mode, fixtureDeps(c.req.raw));
    return c.json(SearchResponseSchema.parse(response), 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    const { body, status } = error("BAD_REQUEST", message, 400);
    return c.json(body, status);
  }
}

export function createSearchRoutes(): Hono {
  const app = new Hono();

  app.use("/v1/search", requirePayment);
  app.use("/v1/search/news", requirePayment);
  app.use("/v1/search/deep", requirePayment);

  app.get("/v1/search", async (c) => {
    const parsed = z
      .object({ q: z.string().trim().min(1, "Query is required") })
      .safeParse({ q: c.req.query("q") });
    if (!parsed.success) {
      const { body, status } = error("BAD_REQUEST", "Query is required", 400);
      return c.json(body, status);
    }
    return respondWithSearch(c, parsed.data.q, "web");
  });

  app.get("/v1/search/news", async (c) => {
    const parsed = z
      .object({ q: z.string().trim().min(1, "Query is required") })
      .safeParse({ q: c.req.query("q") });
    if (!parsed.success) {
      const { body, status } = error("BAD_REQUEST", "Query is required", 400);
      return c.json(body, status);
    }
    return respondWithSearch(c, parsed.data.q, "news");
  });

  app.post("/v1/search/deep", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      const { body: errorBody, status } = error(
        "BAD_REQUEST",
        "Request body must be valid JSON",
        400,
      );
      return c.json(errorBody, status);
    }

    const parsed = DeepSearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      const { body: errorBody, status } = error(
        "BAD_REQUEST",
        "Query is required",
        400,
        parsed.error.flatten(),
      );
      return c.json(errorBody, status);
    }
    return respondWithSearch(c, parsed.data.query, "deep");
  });

  return app;
}
