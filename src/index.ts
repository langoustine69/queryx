import { braveSearch, BraveApiError, BraveAuthError, BraveRateLimitError } from "./logic/brave";
import { rank } from "./logic/rank";
import { synthesise } from "./logic/synth";

const port = Number(process.env.PORT ?? 3000);
const x402Network = process.env.X402_NETWORK ?? "base-mainnet";
const x402Asset = process.env.X402_ASSET ?? "USDC";
const x402Receiver = process.env.X402_RECEIVER;
const searchPrice = process.env.QUERYX_PRICE_SEARCH ?? "0.001";
const deepPrice = process.env.QUERYX_PRICE_DEEP ?? "0.005";

type JsonBody = Record<string, unknown>;

function json(body: JsonBody, init?: ResponseInit): Response {
  return Response.json(body, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function paymentRequired(price: string): Response {
  const headers: Record<string, string> = {
    "x-402-payment-required": "true",
    "x-402-price": price,
    "x-402-currency": x402Asset,
    "x-402-network": x402Network,
  };

  if (x402Receiver) {
    headers["x-402-receiver"] = x402Receiver;
  }

  return json(
    {
      error: "PAYMENT_REQUIRED",
      message: "Provide a valid x402 payment signature to use this endpoint.",
    },
    {
      status: 402,
      headers,
    },
  );
}

function errorResponse(error: unknown): Response {
  if (error instanceof BraveRateLimitError) {
    return json({ error: "BRAVE_RATE_LIMITED", message: error.message }, { status: 429 });
  }

  if (error instanceof BraveAuthError) {
    return json({ error: "BRAVE_AUTH_ERROR", message: error.message }, { status: 500 });
  }

  if (error instanceof BraveApiError) {
    return json(
      { error: "BRAVE_API_ERROR", message: error.message, statusCode: error.statusCode },
      { status: 502 },
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return json({ error: "INTERNAL_ERROR", message }, { status: 500 });
}

async function handleSearch(
  request: Request,
  url: URL,
  type: "web" | "news" = "web",
  price = searchPrice,
): Promise<Response> {
  const paymentSignature = url.searchParams.get("payment_signature");
  const headerSignature = request.headers.get("payment-signature");
  const query = url.searchParams.get("q");

  if (!paymentSignature && !headerSignature) return paymentRequired(price);
  if (!query) return json({ error: "MISSING_QUERY", message: "Query parameter q is required." }, { status: 400 });

  try {
    const results = await braveSearch(query, {
      type,
      freshness: type === "news" ? "week" : undefined,
      count: 10,
    });
    const sources = rank(results, 8);
    const synthesis = await synthesise(query, sources);

    return json({
      query,
      type,
      answer: synthesis.answer,
      confidence: synthesis.confidence,
      model: synthesis.model,
      tokens: synthesis.tokens,
      sources,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function parseDeepQuery(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    return typeof body?.q === "string" ? body.q : null;
  } catch {
    return null;
  }
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/v1/search") {
      return handleSearch(request, url);
    }

    if (request.method === "GET" && url.pathname === "/v1/search/news") {
      return handleSearch(request, url, "news");
    }

    if (request.method === "POST" && url.pathname === "/v1/search/deep") {
      const query = await parseDeepQuery(request);
      if (!query) return json({ error: "MISSING_QUERY", message: "JSON body must include q." }, { status: 400 });

      const deepUrl = new URL(request.url);
      deepUrl.searchParams.set("q", query);
      return handleSearch(request, deepUrl, "web", deepPrice);
    }

    return json({ error: "NOT_FOUND" }, { status: 404 });
  },
});

console.log(`Queryx listening on ${port}`);
