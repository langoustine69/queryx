export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  sourceDomain: string;
  publishedAt?: string;
  language?: string;
}

export interface BraveSearchOptions {
  apiKey?: string;
  count?: number;
  offset?: number;
  freshness?: Freshness;
  country?: string;
  searchLang?: string;
  safeSearch?: "off" | "moderate" | "strict";
  timeoutMs?: number;
  signal?: AbortSignal;
  now?: Date;
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
  language?: string;
  profile?: {
    name?: string;
  };
}

interface BraveResponse {
  web?: {
    results?: BraveWebResult[];
  };
  error?: {
    detail?: string;
    message?: string;
  };
}

export class BraveClientError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly retryAfterSeconds?: number;

  constructor(message: string, code: string, status?: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "BraveClientError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

function normalizeDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "";
  }
}

function parseRelativeAge(age: string, now: Date): string | undefined {
  const match = age.trim().toLowerCase().match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = match[2];

  const msPerUnit: Record<string, number> = {
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_592_000_000,
    year: 31_536_000_000,
  };

  const ms = msPerUnit[unit];
  if (!ms) {
    return undefined;
  }

  return new Date(now.getTime() - value * ms).toISOString();
}

function parsePublishedAt(item: BraveWebResult, now: Date): string | undefined {
  if (item.page_age) {
    const d = new Date(item.page_age);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  if (item.age) {
    const d = new Date(item.age);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
    return parseRelativeAge(item.age, now);
  }

  return undefined;
}

function normalizeResult(item: BraveWebResult, now: Date): SearchResult | null {
  const title = item.title?.trim() ?? "";
  const url = item.url?.trim() ?? "";
  const snippet = item.description?.trim() ?? "";

  if (!title || !url || !snippet) {
    return null;
  }

  const sourceDomain = normalizeDomain(url);
  if (!sourceDomain) {
    return null;
  }

  return {
    title,
    url,
    snippet,
    sourceDomain,
    publishedAt: parsePublishedAt(item, now),
    language: item.language,
  };
}

async function safeReadErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    if (!text) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(text) as BraveResponse;
      return parsed.error?.detail ?? parsed.error?.message ?? text;
    } catch {
      return text;
    }
  } catch {
    return undefined;
  }
}

export async function searchBrave(query: string, options: BraveSearchOptions = {}): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveClientError("Missing BRAVE_API_KEY.", "missing_api_key");
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    count: String(options.count ?? 10),
    offset: String(options.offset ?? 0),
    country: options.country ?? "US",
    search_lang: options.searchLang ?? "en",
    safesearch: options.safeSearch ?? "moderate",
  });

  if (options.freshness) {
    params.set("freshness", FRESHNESS_MAP[options.freshness]);
  }

  const endpoint = `${BRAVE_SEARCH_ENDPOINT}?${params.toString()}`;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const now = options.now ?? new Date();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  let externalAbortHandler: (() => void) | undefined;
  if (options.signal) {
    externalAbortHandler = () => controller.abort(options.signal?.reason ?? "aborted");
    if (options.signal.aborted) {
      externalAbortHandler();
    } else {
      options.signal.addEventListener("abort", externalAbortHandler, { once: true });
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await safeReadErrorMessage(response);
      if (response.status === 429) {
        const retryAfterRaw = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : undefined;
        throw new BraveClientError(
          errorText ?? "Brave API rate limit exceeded.",
          "rate_limited",
          429,
          Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new BraveClientError(errorText ?? "Brave API authentication failed.", "auth_error", response.status);
      }

      throw new BraveClientError(errorText ?? "Brave API request failed.", "upstream_error", response.status);
    }

    const body = (await response.json()) as BraveResponse;
    const rawResults = body.web?.results ?? [];

    return rawResults
      .map((item) => normalizeResult(item, now))
      .filter((item): item is SearchResult => item !== null);
  } catch (error) {
    if (error instanceof BraveClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new BraveClientError("Brave request timed out.", "timeout");
    }

    throw new BraveClientError(
      error instanceof Error ? error.message : "Unknown network error while calling Brave API.",
      "network_error",
    );
  } finally {
    clearTimeout(timeout);
    if (options.signal && externalAbortHandler) {
      options.signal.removeEventListener("abort", externalAbortHandler);
    }
  }
}