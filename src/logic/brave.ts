import type { Freshness, SearchResult } from "./types";

export interface BraveSearchParams {
  query: string;
  count?: number;
  freshness?: Freshness;
  country?: string;
  language?: string;
  safeSearch?: "off" | "moderate" | "strict";
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class BraveApiError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status = 500, body?: string) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.body = body;
  }
}

export class BraveRateLimitError extends BraveApiError {
  retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null, body?: string) {
    super("Brave API rate limit exceeded", 429, body);
    this.name = "BraveRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

function normalizeDomain(input: string): string {
  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return "";

  try {
    const parsed = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return cleaned.replace(/^www\./, "");
  }
}

function toIsoDate(input: unknown): string | undefined {
  if (typeof input !== "string" || input.trim().length === 0) return undefined;
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function parseResult(item: any): SearchResult | null {
  const url = typeof item?.url === "string" ? item.url.trim() : "";
  const title = typeof item?.title === "string" ? item.title.trim() : "";
  const snippet = typeof item?.description === "string" ? item.description.trim() : "";

  if (!url || !title) return null;

  const domainInput =
    typeof item?.meta_url?.hostname === "string" && item.meta_url.hostname.trim().length > 0
      ? item.meta_url.hostname
      : url;

  return {
    title,
    url,
    snippet,
    domain: normalizeDomain(domainInput),
    publishedAt: toIsoDate(item?.page_fetched) ?? toIsoDate(item?.published) ?? toIsoDate(item?.date),
    source: "brave",
  };
}

export function normalizeBraveResponse(payload: unknown): SearchResult[] {
  const rawResults = (payload as any)?.web?.results;
  if (!Array.isArray(rawResults)) return [];

  const normalized: SearchResult[] = [];
  for (const item of rawResults) {
    const parsed = parseResult(item);
    if (parsed) normalized.push(parsed);
  }
  return normalized;
}

async function readResponseTextSafe(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function searchBrave(params: BraveSearchParams): Promise<SearchResult[]> {
  const query = params.query?.trim();
  if (!query) {
    throw new BraveApiError("Query is required", 400);
  }

  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveApiError("Missing BRAVE_API_KEY", 500);
  }

  const endpoint = process.env.BRAVE_API_URL ?? "https://api.search.brave.com/res/v1/web/search";

  const queryParams = new URLSearchParams();
  queryParams.set("q", query);
  queryParams.set("count", String(params.count ?? 10));
  if (params.country) queryParams.set("country", params.country);
  if (params.language) queryParams.set("search_lang", params.language);
  if (params.safeSearch) queryParams.set("safesearch", params.safeSearch);
  if (params.freshness) queryParams.set("freshness", FRESHNESS_MAP[params.freshness]);

  const url = `${endpoint}?${queryParams.toString()}`;

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let externalAbortListener: (() => void) | undefined;

  if (params.signal) {
    if (params.signal.aborted) {
      controller.abort();
    } else {
      externalAbortListener = () => controller.abort();
      params.signal.addEventListener("abort", externalAbortListener, { once: true });
    }
  }

  if (params.timeoutMs && params.timeoutMs > 0) {
    timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfterRaw = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterRaw ? Number.parseInt(retryAfterRaw, 10) : null;
      const body = await readResponseTextSafe(response);
      throw new BraveRateLimitError(Number.isNaN(retryAfterSeconds as number) ? null : retryAfterSeconds, body);
    }

    if (!response.ok) {
      const body = await readResponseTextSafe(response);
      throw new BraveApiError(`Brave API request failed with status ${response.status}`, response.status, body);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BraveApiError("Invalid JSON from Brave API", response.status);
    }

    return normalizeBraveResponse(payload);
  } catch (error) {
    if (error instanceof BraveApiError) throw error;
    if ((error as Error)?.name === "AbortError") {
      throw new BraveApiError("Brave API request timed out or was aborted", 408);
    }
    throw new BraveApiError(`Brave API request failed: ${(error as Error)?.message ?? "Unknown error"}`, 500);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (externalAbortListener && params.signal) {
      params.signal.removeEventListener("abort", externalAbortListener);
    }
  }
}

export const braveSearch = searchBrave;
export const search = searchBrave;
export default searchBrave;