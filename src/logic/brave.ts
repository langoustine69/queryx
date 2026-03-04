import type { Freshness, SearchResult } from "./types";

const DEFAULT_BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_TIMEOUT_MS = 10_000;

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  page_age?: string;
  extra_snippets?: string[];
  profile?: {
    name?: string;
  };
  score?: number;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export interface BraveSearchParams {
  freshness?: Freshness;
  count?: number;
  offset?: number;
}

export interface BraveClientOptions {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class BraveApiError extends Error {
  public readonly status: number;
  public readonly body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.body = body;
  }
}

export class BraveRateLimitError extends BraveApiError {
  public readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, body?: string) {
    super(message, 429, body);
    this.name = "BraveRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function normalizeResult(result: BraveWebResult): SearchResult | null {
  const title = (result.title ?? "").trim();
  const url = (result.url ?? "").trim();

  const description =
    (result.description ?? "").trim() ||
    (result.extra_snippets ?? []).map((item) => item.trim()).filter(Boolean).join(" ");

  if (!title || !url || !description) {
    return null;
  }

  const domain = extractDomain(url);
  if (!domain) {
    return null;
  }

  const source = (result.profile?.name ?? "").trim() || domain;
  const publishedAt = toIsoDate(result.page_age ?? result.age);

  return {
    title,
    url,
    description,
    source,
    domain,
    publishedAt,
    score: typeof result.score === "number" ? result.score : undefined,
  };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function searchBrave(
  query: string,
  params: BraveSearchParams = {},
  options: BraveClientOptions = {},
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveApiError("Missing BRAVE_API_KEY.", 500);
  }

  const endpoint = options.endpoint ?? process.env.BRAVE_API_ENDPOINT ?? DEFAULT_BRAVE_ENDPOINT;
  const fetchImpl = options.fetchImpl ?? fetch;

  const url = new URL(endpoint);
  url.searchParams.set("q", trimmedQuery);

  if (typeof params.count === "number" && params.count > 0) {
    url.searchParams.set("count", String(Math.floor(params.count)));
  }
  if (typeof params.offset === "number" && params.offset >= 0) {
    url.searchParams.set("offset", String(Math.floor(params.offset)));
  }
  if (params.freshness) {
    url.searchParams.set("freshness", FRESHNESS_MAP[params.freshness]);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      const body = await safeReadText(response);
      throw new BraveRateLimitError(
        "Brave API rate limit exceeded.",
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
        body,
      );
    }

    if (!response.ok) {
      const body = await safeReadText(response);
      throw new BraveApiError(`Brave API request failed with status ${response.status}.`, response.status, body);
    }

    const payload = (await response.json()) as BraveSearchResponse;
    const rawResults = payload.web?.results ?? [];

    const normalized: SearchResult[] = [];
    for (const rawResult of rawResults) {
      const item = normalizeResult(rawResult);
      if (item) {
        normalized.push(item);
      }
    }

    return normalized;
  } catch (error: unknown) {
    if (error instanceof BraveApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new BraveApiError("Brave API request timed out.", 408);
    }

    throw new BraveApiError(
      `Brave API request failed: ${error instanceof Error ? error.message : String(error)}`,
      500,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const getBraveSearchResults = searchBrave;

export type { Freshness, SearchResult };
export default searchBrave;