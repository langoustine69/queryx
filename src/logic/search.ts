import { braveSearch, type SearchResult } from "./brave";
import { Cache } from "./cache";
import { rank } from "./rank";
import { scoreConfidence, synthesise, type SynthResult } from "./synth";
import type { SearchResponse } from "../schemas";

export type SearchMode = "web" | "news" | "deep";

export interface SearchDeps {
  fetchSources?: (query: string, mode: SearchMode) => Promise<SearchResult[]>;
  synthesize?: (query: string, sources: SearchResult[]) => Promise<SynthResult>;
  now?: () => Date;
}

const responseCache = new Cache<SearchResponse>();

export function normalizeQuery(query: string): string {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new Error("Query is required");
  }
  return normalized;
}

export function estimateResultsAge(sources: SearchResult[], now = new Date()): string {
  const datedSources = sources
    .map((source) => (source.published ? new Date(source.published) : null))
    .filter(
      (date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()),
    )
    .sort((a, b) => b.getTime() - a.getTime());

  if (datedSources.length === 0) return "unknown";

  const ageMs = Math.max(0, now.getTime() - datedSources[0].getTime());
  const minutes = Math.floor(ageMs / (1000 * 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function buildSearchResponse({
  query,
  sources,
  synthesis,
  fetchedAt,
}: {
  query: string;
  sources: SearchResult[];
  synthesis: SynthResult;
  fetchedAt: string;
}): SearchResponse {
  return {
    query,
    answer: synthesis.answer,
    sources: sources.map((source) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      published: source.published,
    })),
    confidence: synthesis.confidence,
    freshness: {
      fetchedAt,
      resultsAge: estimateResultsAge(sources, new Date(fetchedAt)),
    },
    model: synthesis.model,
    tokens: synthesis.tokens,
  };
}

async function defaultFetchSources(
  query: string,
  mode: SearchMode,
): Promise<SearchResult[]> {
  const type = mode === "news" ? "news" : "web";
  const count = mode === "deep" ? 20 : 10;
  const freshness = mode === "news" ? "day" : undefined;
  return braveSearch(query, { type, count, freshness });
}

async function defaultSynthesize(
  query: string,
  sources: SearchResult[],
): Promise<SynthResult> {
  if (process.env.OPENAI_API_KEY) {
    return synthesise(query, sources);
  }

  return {
    answer:
      sources.length > 0
        ? `Found ${sources.length} ranked sources for "${query}". Configure OPENAI_API_KEY to enable live synthesis.`
        : `No live sources were available for "${query}".`,
    confidence: scoreConfidence(sources),
    model: "queryx-fast-v1",
    tokens: { in: query.length, out: 0 },
  };
}

export async function searchAndSynthesize(
  query: string,
  mode: SearchMode,
  deps: SearchDeps = {},
): Promise<SearchResponse> {
  const normalizedQuery = normalizeQuery(query);
  const cacheKey = Cache.normalizeKey(normalizedQuery, { mode });
  const cached = responseCache.get(cacheKey);
  if (cached) return cached.value;

  const fetchSources = deps.fetchSources ?? defaultFetchSources;
  const synthesize = deps.synthesize ?? defaultSynthesize;
  const now = deps.now ?? (() => new Date());

  const rawSources = await fetchSources(normalizedQuery, mode);
  const topSources = rank(rawSources, mode === "deep" ? 12 : 8);
  const synthesis = await synthesize(normalizedQuery, topSources);
  const response = buildSearchResponse({
    query: normalizedQuery,
    sources: topSources,
    synthesis,
    fetchedAt: now().toISOString(),
  });

  responseCache.set(cacheKey, response);
  return response;
}

export function clearSearchCache(): void {
  responseCache.clear();
}
