/**
 * Brave Search API client.
 * Wraps the Brave Web Search API and normalizes results.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  published?: string;
  score?: number;
}

export interface BraveSearchOptions {
  freshness?: "day" | "week" | "month";
  count?: number;
  type?: "web" | "news";
}

export class BraveApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "BraveApiError";
  }
}

export class BraveRateLimitError extends BraveApiError {
  constructor() {
    super(429, "Brave API rate limit exceeded");
    this.name = "BraveRateLimitError";
  }
}

export class BraveAuthError extends BraveApiError {
  constructor() {
    super(401, "Invalid Brave API key");
    this.name = "BraveAuthError";
  }
}

const BRAVE_API_BASE = "https://api.search.brave.com/res/v1";

export async function braveSearch(
  query: string,
  opts?: BraveSearchOptions,
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveAuthError();
  }

  const count = opts?.count ?? 10;
  const searchType = opts?.type ?? "web";
  const endpoint = searchType === "news" ? "news/search" : "web/search";

  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  if (opts?.freshness) {
    params.set("freshness", opts.freshness);
  }

  const url = `${BRAVE_API_BASE}/${endpoint}?${params}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (response.status === 429) throw new BraveRateLimitError();
  if (response.status === 401) throw new BraveAuthError();
  if (!response.ok) {
    throw new BraveApiError(
      response.status,
      `Brave API error: ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();

  if (searchType === "news") {
    return normalizeNewsResults(body);
  }
  return normalizeWebResults(body);
}

function normalizeWebResults(body: any): SearchResult[] {
  const results: SearchResult[] = [];
  const webResults = body?.web?.results ?? [];

  for (const r of webResults) {
    results.push({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? "",
      published: r.page_age ?? undefined,
      score: r.relevance_score ?? undefined,
    });
  }

  return results;
}

function normalizeNewsResults(body: any): SearchResult[] {
  const results: SearchResult[] = [];
  const newsResults = body?.results ?? [];

  for (const r of newsResults) {
    results.push({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? "",
      published: r.age ?? undefined,
      score: r.relevance_score ?? undefined,
    });
  }

  return results;
}
