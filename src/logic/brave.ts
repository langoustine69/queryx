import { SearchFreshness, SearchResult } from "./types";

export interface BraveSearchOptions {
  freshness?: SearchFreshness;
  count?: number;
  offset?: number;
  signal?: AbortSignal;
  apiKey?: string;
  endpoint?: string;
}

interface BraveResultRow {
  title?: string;
  url?: string;
  description?: string;
  page_age?: string;
  age?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveResultRow[];
  };
}

const FRESHNESS_MAP: Record<SearchFreshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

export class BraveApiError extends Error {
  status?: number;
  cause?: unknown;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.cause = cause;
  }
}

export class BraveRateLimitError extends BraveApiError {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, cause?: unknown) {
    super(message, 429, cause);
    this.name = "BraveRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function normalizeBraveResponse(payload: BraveSearchResponse): SearchResult[] {
  const rows = payload?.web?.results ?? [];
  const total = rows.length || 1;

  return rows
    .map((row, index) => {
      const title = (row.title ?? "").trim();
      const url = (row.url ?? "").trim();
      const snippet = (row.description ?? "").trim();
      const domain = extractDomain(url);
      const publishedAt = toIsoDate(row.page_age) ?? toIsoDate(row.age);

      if (!title || !url || !domain) {
        return null;
      }

      return {
        title,
        url,
        snippet,
        domain,
        publishedAt,
        source: "brave",
        score: clamp(1 - index / total),
      } satisfies SearchResult;
    })
    .filter((item): item is SearchResult => item !== null);
}

function toIsoDate(input?: string): string | undefined {
  if (!input) return undefined;
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}

function extractDomain(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

async function getErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return `Brave API error (${res.status})`;
  }

  try {
    const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return json.error?.message ?? json.message ?? text;
  } catch {
    return text;
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export async function searchBrave(query: string, options: BraveSearchOptions = {}): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveApiError("Missing BRAVE_API_KEY");
  }

  const endpoint = options.endpoint ?? process.env.BRAVE_SEARCH_ENDPOINT ?? "https://api.search.brave.com/res/v1/web/search";
  const params = new URLSearchParams({
    q: normalizedQuery,
    count: String(options.count ?? 10),
    offset: String(options.offset ?? 0),
  });

  if (options.freshness) {
    params.set("freshness", FRESHNESS_MAP[options.freshness]);
  }

  const url = `${endpoint}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });
  } catch (error) {
    throw new BraveApiError("Network error while calling Brave Search API", undefined, error);
  }

  if (res.status === 429) {
    const retryAfterRaw = res.headers.get("retry-after");
    const retryAfterSeconds = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : undefined;
    const message = await getErrorMessage(res);
    throw new BraveRateLimitError(message || "Brave Search API rate limit exceeded", retryAfterSeconds);
  }

  if (!res.ok) {
    const message = await getErrorMessage(res);
    throw new BraveApiError(message, res.status);
  }

  let payload: BraveSearchResponse;
  try {
    payload = (await res.json()) as BraveSearchResponse;
  } catch (error) {
    throw new BraveApiError("Invalid JSON response from Brave Search API", res.status, error);
  }

  return normalizeBraveResponse(payload);
}

export const search = searchBrave;
export default searchBrave;