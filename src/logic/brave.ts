import type { Freshness, SearchResult } from "./types";

export interface BraveSearchOptions {
  freshness?: Freshness;
  count?: number;
  offset?: number;
  signal?: AbortSignal;
}

export class BraveError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BraveError";
    this.status = status;
  }
}

export class BraveApiError extends BraveError {
  constructor(message: string, status?: number) {
    super(message, status);
    this.name = "BraveApiError";
  }
}

export class BraveRateLimitError extends BraveApiError {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message, 429);
    this.name = "BraveRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const FRESHNESS_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

const DEFAULT_COUNT = 10;
const MAX_COUNT = 20;

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function parsePublishedAt(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const asMs = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(asMs);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function normalizeCount(count?: number): number {
  if (typeof count !== "number" || !Number.isFinite(count)) return DEFAULT_COUNT;
  if (count < 1) return 1;
  if (count > MAX_COUNT) return MAX_COUNT;
  return Math.floor(count);
}

function normalizeOffset(offset?: number): number {
  if (typeof offset !== "number" || !Number.isFinite(offset)) return 0;
  return Math.max(0, Math.floor(offset));
}

function normalizeBraveResult(rawItem: unknown): SearchResult | null {
  if (!rawItem || typeof rawItem !== "object") return null;

  const item = rawItem as Record<string, unknown>;
  const title = toStringValue(item.title);
  const url = toStringValue(item.url);
  const snippet = toStringValue(item.description) || toStringValue(item.snippet);

  if (!title || !url) return null;

  const metaUrl = item.meta_url && typeof item.meta_url === "object"
    ? (item.meta_url as Record<string, unknown>)
    : undefined;

  const domainFromMeta = toStringValue(metaUrl?.hostname);
  const domain = (domainFromMeta || extractDomain(url) || "").toLowerCase();

  if (!domain) return null;

  const publishedAt = parsePublishedAt(item.page_age ?? item.published ?? item.age);

  return {
    title,
    url,
    snippet,
    domain,
    source: "brave",
    publishedAt,
  };
}

export function normaliseBraveResponse(payload: unknown): SearchResult[] {
  const root = payload as { web?: { results?: unknown } };
  const results = root?.web?.results;

  if (!Array.isArray(results)) return [];

  const normalized: SearchResult[] = [];
  for (const item of results) {
    const parsed = normalizeBraveResult(item);
    if (parsed) normalized.push(parsed);
  }
  return normalized;
}

export async function searchBrave(
  query: string,
  options: BraveSearchOptions = {},
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const apiKey = process.env.BRAVE_API_KEY?.trim();
  const endpoint = process.env.BRAVE_API_URL?.trim();

  if (!apiKey) {
    throw new BraveApiError("BRAVE_API_KEY is not set");
  }

  if (!endpoint) {
    throw new BraveApiError("BRAVE_API_URL is not set");
  }

  const params = new URLSearchParams();
  params.set("q", trimmedQuery);
  params.set("count", String(normalizeCount(options.count)));
  params.set("offset", String(normalizeOffset(options.offset)));

  if (options.freshness) {
    params.set("freshness", FRESHNESS_MAP[options.freshness]);
  }

  const requestUrl = `${endpoint}${endpoint.includes("?") ? "&" : "?"}${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: options.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new BraveApiError(`Failed to call Brave API: ${message}`);
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined;
    throw new BraveRateLimitError("Brave API rate limit exceeded", retryAfterSeconds);
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "";
    }
    const suffix = body ? `: ${body}` : "";
    throw new BraveApiError(`Brave API request failed (${response.status})${suffix}`, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BraveApiError("Brave API returned invalid JSON", response.status);
  }

  return normaliseBraveResponse(payload);
}

export type { SearchResult, Freshness } from "./types";
export default searchBrave;