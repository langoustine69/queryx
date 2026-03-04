export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
  publishedAt?: string;
  score?: number;
  source: "brave";
}

export interface BraveSearchOptions {
  apiKey?: string;
  endpoint?: string;
  freshness?: Freshness;
  count?: number;
  offset?: number;
  country?: string;
  language?: string;
  safeSearch?: "off" | "moderate" | "strict";
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type BraveErrorCode =
  | "CONFIGURATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export class BraveApiError extends Error {
  readonly status: number;
  readonly code: BraveErrorCode;
  readonly retryAfterSeconds?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code: BraveErrorCode;
      retryAfterSeconds?: number;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "BraveApiError";
    this.status = options.status;
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.details = options.details;
  }
}

interface BraveRawResult {
  title?: string;
  url?: string;
  description?: string;
  extra_snippets?: unknown;
  page_age?: unknown;
  age?: unknown;
}

interface BraveRawResponse {
  web?: {
    results?: BraveRawResult[];
  };
}

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractDomain(inputUrl: string): string {
  try {
    return new URL(inputUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function parsePublishedAt(value: unknown): string | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
  }

  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
  }

  if (typeof value === "object") {
    const maybeDate = (value as { date?: unknown }).date;
    if (typeof maybeDate === "string") {
      const ms = Date.parse(maybeDate);
      return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
    }
  }

  return undefined;
}

function parseDescription(raw: BraveRawResult): string {
  if (typeof raw.description === "string" && raw.description.trim()) {
    return normalizeWhitespace(raw.description);
  }

  if (Array.isArray(raw.extra_snippets)) {
    const first = raw.extra_snippets.find((s) => typeof s === "string");
    if (typeof first === "string") {
      return normalizeWhitespace(first);
    }
  }

  return "";
}

export function normalizeBraveResponse(payload: unknown): SearchResult[] {
  const data = payload as BraveRawResponse;
  const rawResults = data?.web?.results;
  if (!Array.isArray(rawResults)) return [];

  const normalized: SearchResult[] = [];

  for (const item of rawResults) {
    if (!item || typeof item.url !== "string") continue;

    const url = item.url.trim();
    const domain = extractDomain(url);
    if (!url || !domain) continue;

    const title =
      typeof item.title === "string" && item.title.trim()
        ? normalizeWhitespace(item.title)
        : "Untitled";

    const description = parseDescription(item);
    const publishedAt = parsePublishedAt(item.page_age ?? item.age);

    normalized.push({
      title,
      url,
      description,
      domain,
      publishedAt,
      source: "brave",
    });
  }

  return normalized;
}

async function parseResponseDetails(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    const text = await response.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

function buildQueryParams(query: string, options: BraveSearchOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set("q", query);

  params.set("count", String(options.count ?? 10));
  params.set("offset", String(options.offset ?? 0));

  if (options.country) params.set("country", options.country);
  if (options.language) params.set("search_lang", options.language);
  if (options.safeSearch) params.set("safesearch", options.safeSearch);
  if (options.freshness) params.set("freshness", FRESHNESS_MAP[options.freshness]);

  return params;
}

function buildRequestUrl(endpoint: string, params: URLSearchParams): string {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}${params.toString()}`;
}

export async function searchBrave(
  query: string,
  options: BraveSearchOptions = {},
): Promise<SearchResult[]> {
  const normalizedQuery = normalizeWhitespace(query);
  if (!normalizedQuery) {
    throw new BraveApiError("Query is required", {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveApiError("Missing Brave API key", {
      status: 500,
      code: "CONFIGURATION_ERROR",
    });
  }

  const endpoint = options.endpoint ?? process.env.BRAVE_API_ENDPOINT;
  if (!endpoint) {
    throw new BraveApiError("Missing Brave API endpoint", {
      status: 500,
      code: "CONFIGURATION_ERROR",
    });
  }

  const timeoutMs = options.timeoutMs ?? 8_000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const requestUrl = buildRequestUrl(endpoint, buildQueryParams(normalizedQuery, options));

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await parseResponseDetails(response);

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : undefined;

        throw new BraveApiError("Brave API rate limit exceeded", {
          status: 429,
          code: "RATE_LIMITED",
          retryAfterSeconds: Number.isFinite(retryAfterSeconds)
            ? retryAfterSeconds
            : undefined,
          details,
        });
      }

      if (response.status === 400) {
        throw new BraveApiError("Brave API rejected request", {
          status: 400,
          code: "BAD_REQUEST",
          details,
        });
      }

      if (response.status === 401) {
        throw new BraveApiError("Brave API unauthorized", {
          status: 401,
          code: "UNAUTHORIZED",
          details,
        });
      }

      if (response.status === 403) {
        throw new BraveApiError("Brave API forbidden", {
          status: 403,
          code: "FORBIDDEN",
          details,
        });
      }

      throw new BraveApiError("Brave API upstream error", {
        status: response.status,
        code: "UPSTREAM_ERROR",
        details,
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BraveApiError("Invalid JSON from Brave API", {
        status: 502,
        code: "INVALID_RESPONSE",
      });
    }

    return normalizeBraveResponse(payload);
  } catch (error) {
    if (error instanceof BraveApiError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new BraveApiError("Brave API request timed out", {
        status: 504,
        code: "TIMEOUT",
      });
    }

    throw new BraveApiError("Brave API network error", {
      status: 502,
      code: "NETWORK_ERROR",
      details: error,
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}