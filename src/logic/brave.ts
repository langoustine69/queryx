export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
  source?: string;
  score?: number;
}

export interface BraveSearchOptions {
  freshness?: Freshness;
  count?: number;
  offset?: number;
  signal?: AbortSignal;
  apiKey?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export class BraveApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.details = details;
  }
}

export class BraveRateLimitError extends BraveApiError {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, details?: unknown) {
    super(message, 429, details);
    this.name = "BraveRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

function getApiKey(options: BraveSearchOptions): string {
  return (
    options.apiKey ??
    process.env.BRAVE_API_KEY ??
    process.env.BRAVE_SEARCH_API_KEY ??
    ""
  );
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function parsePublishedAt(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const s = normalizeString(value);
    if (s) return s;
  }
  return "";
}

export function normalizeBraveResponse(payload: unknown): SearchResult[] {
  const data = payload as {
    web?: { results?: Array<Record<string, unknown>> };
  };

  const rows = data?.web?.results;
  if (!Array.isArray(rows)) return [];

  const normalized: SearchResult[] = [];

  for (const row of rows) {
    const url = firstNonEmpty(row.url, (row as { profile?: { url?: string } }).profile?.url);
    if (!url) continue;

    const domain = safeDomain(url);
    if (!domain) continue;

    const title = firstNonEmpty(row.title);
    const snippet = firstNonEmpty(
      row.description,
      row.snippet,
      Array.isArray(row.extra_snippets) ? row.extra_snippets[0] : ""
    );

    normalized.push({
      title: title || domain,
      url,
      snippet,
      domain,
      source: firstNonEmpty(
        (row as { profile?: { name?: string } }).profile?.name,
        (row as { meta_url?: { hostname?: string } }).meta_url?.hostname,
        domain
      ),
      publishedAt: parsePublishedAt(
        firstNonEmpty(
          row.page_age,
          row.published,
          row.published_at,
          row.last_updated
        )
      ),
    });
  }

  return normalized;
}

async function parseErrorDetails(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return undefined;
  }
}

export async function searchBrave(
  query: string,
  options: BraveSearchOptions = {}
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const apiKey = getApiKey(options);
  if (!apiKey) {
    throw new Error("Missing Brave API key. Set BRAVE_API_KEY.");
  }

  const endpoint =
    options.endpoint ??
    process.env.BRAVE_SEARCH_ENDPOINT ??
    "https://api.search.brave.com/res/v1/web/search";

  const requestUrl = new URL(endpoint);
  requestUrl.searchParams.set("q", trimmedQuery);
  requestUrl.searchParams.set("result_filter", "web");

  if (typeof options.count === "number") {
    requestUrl.searchParams.set("count", String(options.count));
  }
  if (typeof options.offset === "number") {
    requestUrl.searchParams.set("offset", String(options.offset));
  }
  if (options.freshness) {
    requestUrl.searchParams.set("freshness", FRESHNESS_MAP[options.freshness]);
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(requestUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
    signal: options.signal,
  });

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const details = await parseErrorDetails(response);
    throw new BraveRateLimitError(
      "Brave API rate limit exceeded",
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      details
    );
  }

  if (!response.ok) {
    const details = await parseErrorDetails(response);
    throw new BraveApiError(
      `Brave API request failed with status ${response.status}`,
      response.status,
      details
    );
  }

  const payload = await response.json();
  return normalizeBraveResponse(payload);
}

export default searchBrave;