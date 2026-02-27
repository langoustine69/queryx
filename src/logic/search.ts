/**
 * Query handling + source coordination.
 * Orchestrates brave search, ranking, synthesis, and caching.
 */
import { braveSearch, type SearchResult, type BraveSearchOptions } from "./brave";
import { rank as rankAndDeduplicate } from "./rank";
import { synthesise as synthesize } from "./synth";
import { Cache } from "./cache";
import type { SearchResponse } from "../schemas";

const cache = new Cache<SearchResponse>(
  Number(process.env.CACHE_TTL_SECONDS || 300) * 1000
);


export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function computeResultsAge(sources: SearchResult[]): string {
  if (!sources.length) return "unknown";
  const now = Date.now();
  const published = sources
    .filter((s) => s.published)
    .map((s) => new Date(s.published!).getTime())
    .filter((t) => !isNaN(t));
  if (!published.length) return "unknown";
  const newest = Math.max(...published);
  const diffMs = now - newest;
  const hours = Math.round(diffMs / 3600000);
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export interface SearchOptions {
  type?: "web" | "news";
  count?: number;
  deep?: boolean;
}

export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const normalized = normalizeQuery(query);
  const cacheKey = `${options.type || "web"}:${options.deep ? "deep:" : ""}${normalized}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached.value;

  const braveOpts: BraveSearchOptions = {
    count: options.count || 5,
    type: options.type || "web",
  };
  if (options.type === "news") braveOpts.freshness = "day";

  const rawResults = await braveSearch(normalized, braveOpts);
  const ranked = rankAndDeduplicate(rawResults);
  const synthResult = await synthesize(normalized, ranked);

  const response: SearchResponse = {
    query,
    answer: synthResult.answer,
    sources: ranked.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      ...(r.published ? { published: r.published } : {}),
    })),
    confidence: synthResult.confidence,
    freshness: {
      fetchedAt: new Date().toISOString(),
      resultsAge: computeResultsAge(ranked),
    },
    model: synthResult.model,
    tokens: synthResult.tokens,
  };

  cache.set(cacheKey, response);
  return response;
}

export { cache };
