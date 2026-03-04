export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
  source: "brave";
}

export interface BraveSearchOptions {
  apiKey?: string;
  freshness?: Freshness;
  count?: number;
  offset?: number;
  endpoint?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface BraveSearchResponse {
  web?: {
    results?: BraveRawResult[];
  };
  results?: BraveRawResult[];
  error?: { message?: string } | string;
  message?: string;
}

export interface BraveRawResult {
  title?: string;
  url?: string;
  description?: string;
  snippet?: string;
  extra_snippets?: string[];
  age?: string;
  page_age?: string;
  published?: string;
  date?: string;
  [key: string]: unknown;
}

export class BraveApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, code: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm"
};

const DEFAULT_BRAVE_ENDPOINT =
  process.env.BRAVE_API_ENDPOINT ?? "https://api.search.brave.com/res/v1/web/search";

const DEFAULT_TIMEOUT_MS = Number(process.env.BRAVE_TIMEOUT_MS ?? "10000");

function toDomain(rawUrl: string): string {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "";
  }
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  return undefined;
}

function parseErrorMessage(rawBody: string, status: number): string {
  if (!rawBody) {
    return `Brave API request failed (${status})`;
  }

  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error && typeof parsed.error === "object" && typeof parsed.error.message === "string") {
      return parsed.error.message;
    }
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    return rawBody;
  }

  return `Brave API request failed (${status})`;
}

function normalizeResult(raw: BraveRawResult): SearchResult | null {
  const title = (raw.title ?? "").toString().trim();
  const url = (raw.url ?? "").toString().trim();
  const snippet = (raw.description ?? raw.snippet ?? "").toString().trim();

  if (!title || !url) {
    return null;
  }

  const extraSnippets = Array.isArray(raw.extra_snippets)
    ? raw.extra_snippets.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  const mergedSnippet = [snippet, ...extraSnippets].filter(Boolean).join(" ").trim();

  const publishedAt =
    toIsoDate(raw.page_age) ?? toIsoDate(raw.age) ?? toIsoDate(raw.published) ?? toIsoDate(raw.date);

  return {
    title,
    url,
    snippet: mergedSnippet,
    domain: toDomain(url),
    publishedAt,
    source: "brave"
  };
}

function buildEndpoint(query: string, options: BraveSearchOptions): string {
  const endpoint = options.endpoint ?? DEFAULT_BRAVE_ENDPOINT;
  const freshness = options.freshness ? FRESHNESS_MAP[options.freshness] : undefined;
  const count = Math.min(Math.max(options.count ?? 10, 1), 20);
  const offset = Math.max(options.offset ?? 0, 0);

  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  if (offset > 0) url.searchParams.set("offset", String(offset));
  if (freshness) url.searchParams.set("freshness", freshness);

  return url.toString();
}

export async function searchBrave(query: string, options: BraveSearchOptions = {}): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveApiError("Missing BRAVE_API_KEY", 401, "MISSING_API_KEY");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? (options.timeoutMs as number) : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener(
      "abort",
      () => {
        controller.abort(options.signal?.reason);
      },
      { once: true }
    );
  }

  try {
    const endpoint = buildEndpoint(normalizedQuery, options);
    const response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey
      },
      signal: controller.signal
    });

    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
      const body = await response.text();
      const message = parseErrorMessage(body, 429);
      throw new BraveApiError(message, 429, "RATE_LIMITED", retryAfterSeconds);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new BraveApiError(parseErrorMessage(body, response.status), response.status, "HTTP_ERROR");
    }

    const payload = (await response.json()) as BraveSearchResponse;
    const items = payload.web?.results ?? payload.results ?? [];
    if (!Array.isArray(items)) {
      return [];
    }

    const normalized: SearchResult[] = [];
    for (const item of items) {
      const result = normalizeResult(item);
      if (result) normalized.push(result);
    }

    return normalized;
  } catch (error) {
    if (error instanceof BraveApiError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new BraveApiError("Brave API request timed out", 408, "TIMEOUT");
    }

    throw new BraveApiError(
      error instanceof Error ? error.message : "Unexpected Brave API error",
      500,
      "UNKNOWN"
    );
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  searchBrave
};