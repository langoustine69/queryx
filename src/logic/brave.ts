import type { Freshness, SearchResult } from "./types";

export interface BraveSearchOptions {
  apiKey?: string;
  endpoint?: string;
  count?: number;
  freshness?: Freshness;
  country?: string;
  searchLang?: string;
  timeoutMs?: number;
}

export class BraveApiError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code: string,
    retryAfterSeconds?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.details = details;
  }
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
  meta_url?: {
    hostname?: string;
  };
  profile?: {
    long_name?: string;
  };
}

interface BraveResponse {
  web?: {
    results?: BraveWebResult[];
  };
  error?: {
    code?: string;
    message?: string;
  };
}

const DEFAULT_BRAVE_ENDPOINT =
  process.env.BRAVE_SEARCH_ENDPOINT ?? "https://api.search.brave.com/res/v1/web/search";

function mapFreshness(freshness?: Freshness): string | undefined {
  if (!freshness) return undefined;
  switch (freshness) {
    case "day":
      return "pd";
    case "week":
      return "pw";
    case "month":
      return "pm";
    default:
      return undefined;
  }
}

function domainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function parsePublishedAt(value?: string): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function normalizeOne(result: BraveWebResult): SearchResult | null {
  if (!result || !result.url || !result.title) return null;

  const description = typeof result.description === "string" ? result.description.trim() : "";
  if (description.length === 0) return null;

  const domain =
    (result.meta_url?.hostname || domainFromUrl(result.url)).replace(/^www\./i, "").toLowerCase();

  return {
    title: result.title.trim(),
    url: result.url,
    description,
    domain,
    publishedAt: parsePublishedAt(result.page_age) ?? parsePublishedAt(result.age),
    source: "brave",
  };
}

export function normalizeBraveResponse(payload: unknown): SearchResult[] {
  if (!payload || typeof payload !== "object") return [];
  const typed = payload as BraveResponse;
  const results = typed.web?.results;
  if (!Array.isArray(results)) return [];

  const normalized: SearchResult[] = [];
  for (const raw of results) {
    const item = normalizeOne(raw);
    if (item) normalized.push(item);
  }
  return normalized;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseRetryAfterSeconds(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const asNumber = Number(headerValue);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;

  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return undefined;
  const deltaMs = asDate - Date.now();
  return deltaMs > 0 ? Math.ceil(deltaMs / 1000) : 0;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function searchBrave(
  query: string,
  options: BraveSearchOptions = {},
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveApiError("Missing Brave API key", 401, "MISSING_API_KEY");
  }

  const endpoint = options.endpoint ?? DEFAULT_BRAVE_ENDPOINT;
  const count = Math.max(1, Math.min(20, options.count ?? 10));
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 12_000);

  const url = new URL(endpoint);
  url.searchParams.set("q", trimmedQuery);
  url.searchParams.set("count", String(count));
  if (options.country) url.searchParams.set("country", options.country);
  if (options.searchLang) url.searchParams.set("search_lang", options.searchLang);
  const freshness = mapFreshness(options.freshness);
  if (freshness) url.searchParams.set("freshness", freshness);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      },
      timeoutMs,
    );
  } catch (error) {
    throw new BraveApiError(
      error instanceof Error ? error.message : "Brave request failed",
      0,
      "NETWORK_ERROR",
      undefined,
      error,
    );
  }

  const rawText = await response.text();
  const payload = safeJsonParse(rawText) as BraveResponse | undefined;

  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("retry-after"));
    const apiMessage = payload?.error?.message;
    const message = apiMessage || `Brave API error (${response.status})`;
    const code =
      response.status === 429
        ? "RATE_LIMITED"
        : payload?.error?.code || (response.status >= 500 ? "UPSTREAM_ERROR" : "REQUEST_ERROR");

    throw new BraveApiError(message, response.status, code, retryAfterSeconds, payload);
  }

  return normalizeBraveResponse(payload);
}

export type { Freshness, SearchResult };
export default searchBrave;