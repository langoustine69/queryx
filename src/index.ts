import { braveSearch } from "./logic/brave";
import { Cache } from "./logic/cache";
import { rank } from "./logic/rank";
import { synthesise } from "./logic/synth";

const cache = new Cache<Response>();

const PRICES: Record<string, string> = {
  "/v1/search": "0.001",
  "/v1/search/news": "0.001",
  "/v1/search/deep": "0.005",
};

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function hasPayment(request: Request): boolean {
  return Boolean(
    request.headers.get("payment-signature") ??
      request.headers.get("x-payment-signature") ??
      request.headers.get("x402-payment"),
  );
}

function paymentRequired(pathname: string): Response {
  const price = PRICES[pathname] ?? PRICES["/v1/search"];
  const payTo = process.env.X402_PAY_TO ?? "0x0000000000000000000000000000000000000000";
  const network = process.env.X402_NETWORK ?? "base";
  const asset = process.env.X402_ASSET ?? "USDC";

  return json(
    {
      error: "payment_required",
      message: `Send ${price} ${asset} on ${network} and retry with a payment signature.`,
      accepts: [{ asset, network, amount: price, payTo }],
    },
    {
      status: 402,
      headers: {
        "x402-version": "1",
        "x402-accepts": `${asset.toLowerCase()}-${network}`,
        "x402-price": price,
        "x402-pay-to": payTo,
      },
    },
  );
}

function parseQuery(url: URL): string | Response {
  const query = url.searchParams.get("q")?.trim();
  if (!query) {
    return json({ error: "missing_query", message: "Provide a non-empty q query parameter." }, { status: 400 });
  }
  return query;
}

async function handleSearch(request: Request, url: URL, type: "web" | "news"): Promise<Response> {
  if (!hasPayment(request)) {
    return paymentRequired(url.pathname);
  }

  const query = parseQuery(url);
  if (query instanceof Response) return query;

  const cacheKey = Cache.normalizeKey(query, { type });
  const cached = cache.get(cacheKey);
  if (cached) return cached.value.clone();

  const results = rank(await braveSearch(query, { type, count: 10 }), 8);
  const synthesis = await synthesise(query, results);
  const response = json({
    query,
    type,
    answer: synthesis.answer,
    confidence: synthesis.confidence,
    model: synthesis.model,
    tokens: synthesis.tokens,
    sources: results,
  });

  cache.set(cacheKey, response.clone());
  return response;
}

async function handleDeepSearch(request: Request, url: URL): Promise<Response> {
  if (!hasPayment(request)) {
    return paymentRequired(url.pathname);
  }

  return json(
    {
      error: "not_implemented",
      message: "Deep research is reserved for the next implementation phase.",
    },
    { status: 501 },
  );
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (request.method === "GET" && url.pathname === "/v1/search") {
      return handleSearch(request, url, "web");
    }

    if (request.method === "GET" && url.pathname === "/v1/search/news") {
      return handleSearch(request, url, "news");
    }

    if (request.method === "POST" && url.pathname === "/v1/search/deep") {
      return handleDeepSearch(request, url);
    }

    return json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json({ error: "internal_error", message }, { status: 500 });
  }
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  Bun.serve({ port, fetch: handleRequest });
  console.log(`Queryx listening on http://0.0.0.0:${port}`);
}
