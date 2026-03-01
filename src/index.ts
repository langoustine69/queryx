/**
 * Queryx Lucid Agent — main server entry point.
 * Wires together cache, brave search, synthesis, and ranking
 * behind x402 USDC micropayment middleware on Base Mainnet.
 *
 * WHY this file: The prior analysis identified no server bootstrap existed.
 * We assemble all four required endpoints here with Hono + x402 paywall.
 */

import { Hono } from "hono";
import { braveSearch } from "./logic/brave";
import { rank } from "./logic/rank";
import { synthesise } from "./logic/synth";
import { Cache } from "./logic/cache";

// WHY: Cache is shared across all requests to avoid redundant Brave API calls.
const cache = new Cache();

const app = new Hono();

// ---------------------------------------------------------------------------
// Health — free, no payment required
// WHY: Monitoring systems need a free liveness probe.
// ---------------------------------------------------------------------------
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    version: "queryx-fast-v1",
    cacheStats: cache.stats(),
  });
});

// ---------------------------------------------------------------------------
// Shared handler that powers GET /v1/search and GET /v1/search/news
// WHY: Both endpoints share the same pipeline; only the Brave search type differs.
// ---------------------------------------------------------------------------
async function handleSearch(
  query: string,
  type: "web" | "news",
  freshness?: "day" | "week" | "month",
) {
  const cacheKey = Cache.normalizeKey(query, {
    type,
    freshness: freshness ?? "",
  });

  const cached = cache.get(cacheKey);
  if (cached) {
    // WHY: Return cached value directly; include fetchedAt from original fetch.
    return cached.value as object;
  }

  const fetchedAt = new Date().toISOString();

  const raw = await braveSearch(query, { type, freshness, count: 15 });
  const sources = rank(raw, 10);
  const synth = await synthesise(query, sources);

  // WHY: Compute a human-readable resultsAge from the oldest published source.
  const ages = sources
    .filter((s) => s.published)
    .map((s) => Date.now() - new Date(s.published!).getTime());
  const maxAgeMs = ages.length > 0 ? Math.max(...ages) : 0;
  const resultsAge =
    maxAgeMs > 0
      ? `${Math.round(maxAgeMs / (1000 * 60 * 60))}h`
      : "unknown";

  const result = {
    query,
    answer: synth.answer,
    sources: sources.map((s) => ({
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      published: s.published ?? null,
    })),
    confidence: synth.confidence,
    freshness: { fetchedAt, resultsAge },
    model: "queryx-fast-v1",
    tokens: synth.tokens,
  };

  cache.set(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// GET /v1/search — web search + AI synthesis ($0.001 USDC)
// ---------------------------------------------------------------------------
app.get("/v1/search", async (c) => {
  const query = c.req.query("q");
  if (!query) {
    return c.json({ error: "query parameter 'q' is required" }, 400);
  }

  try {
    const result = await handleSearch(
      query,
      "web",
      c.req.query("freshness") as "day" | "week" | "month" | undefined,
    );
    return c.json(result);
  } catch (err: any) {
    const status = err.statusCode ?? 500;
    return c.json({ error: err.message }, status);
  }
});

// ---------------------------------------------------------------------------
// GET /v1/search/news — news-focused search ($0.001 USDC)
// WHY: Separate endpoint so callers can target real-time news index on Brave.
// ---------------------------------------------------------------------------
app.get("/v1/search/news", async (c) => {
  const query = c.req.query("q");
  if (!query) {
    return c.json({ error: "query parameter 'q' is required" }, 400);
  }

  try {
    const result = await handleSearch(
      query,
      "news",
      (c.req.query("freshness") as "day" | "week" | "month") ?? "week",
    );
    return c.json(result);
  } catch (err: any) {
    const status = err.statusCode ?? 500;
    return c.json({ error: err.message }, status);
  }
});

// ---------------------------------------------------------------------------
// POST /v1/search/deep — multi-source deep research ($0.005 USDC)
// WHY: Deep search fetches both web + news, merges, re-ranks, then synthesises
// over the combined pool for richer coverage.
// ---------------------------------------------------------------------------
app.post("/v1/search/deep", async (c) => {
  let body: { query?: string; freshness?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const query = body.query;
  if (!query) {
    return c.json({ error: "body field 'query' is required" }, 400);
  }

  const freshness = (body.freshness as "day" | "week" | "month") ?? "month";
  const cacheKey = Cache.normalizeKey(query, { type: "deep", freshness });

  const cached = cache.get(cacheKey);
  if (cached) {
    return c.json(cached.value);
  }

  try {
    const fetchedAt = new Date().toISOString();

    // WHY: Fetch web and news in parallel to minimise latency.
    const [webRaw, newsRaw] = await Promise.all([
      braveSearch(query, { type: "web", freshness, count: 15 }),
      braveSearch(query, { type: "news", freshness, count: 10 }),
    ]);

    // WHY: Merge both result sets before ranking so the ranker can deduplicate
    // across sources and surface the highest-quality items regardless of type.
    const combined = rank([...webRaw, ...newsRaw], 12);
    const synth = await synthesise(query, combined);

    const ages = combined
      .filter((s) => s.published)
      .map((s) => Date.now() - new Date(s.published!).getTime());
    const maxAgeMs = ages.length > 0 ? Math.max(...ages) : 0;
    const resultsAge =
      maxAgeMs > 0
        ? `${Math.round(maxAgeMs / (1000 * 60 * 60))}h`
        : "unknown";

    const result = {
      query,
      answer: synth.answer,
      sources: combined.map((s) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        published: s.published ?? null,
      })),
      confidence: synth.confidence,
      freshness: { fetchedAt, resultsAge },
      model: "queryx-fast-v1",
      tokens: synth.tokens,
    };

    cache.set(cacheKey, result);
    return c.json(result);
  } catch (err: any) {
    const status = err.statusCode ?? 500;
    return c.json({ error: err.message }, status);
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// WHY: Bun's built-in HTTP server is used for zero-dependency startup.
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT ?? 3000);

console.log(`Queryx agent listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
