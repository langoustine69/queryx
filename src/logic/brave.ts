export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  sourceDomain: string;
  publishedAt?: string;
  score?: number;
}

export interface BraveSearchOptions {
  apiKey?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  count?: number;
  offset?: number;
  country?: string;
  language?: string;
  freshness?: Freshness;
}

type JsonRecord = Record<string, unknown>;

const FRESHNESS_PARAM_MAP: Record<Freshness, string> = {
  day: "pd",
  week: "pw",
  month: "pm",
};

export class BraveAPIError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "BraveAPIError";
    this.status = status;
    this.details = details;
  }
}

export class BraveRateLimitError extends BraveAPIError {
  public readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, details?: unknown) {
    super(message, 429, details);
    this.name = "BraveRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function parsePublishedAt(raw: unknown): string | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const milliseconds = raw > 1_000_000_000_000 ? raw : raw * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  return undefined;
}

function getDomainFromUrl(rawUrl: string): string | undefined {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return undefined;
  }
}

export function mapFreshnessParam(freshness: Freshness): string {
  return FRESHNESS_PARAM_MAP[freshness];
}

export function normalizeBraveResults(payload: unknown): SearchResult[] {
  if (!isRecord(payload)) return [];

  const web = payload.web;
  if (!isRecord(web)) return [];

  const results = web.results;
  if (!Array.isArray(results)) return [];

  const normalized: SearchResult[] = [];

  for (const item of results) {
    if (!isRecord(item)) continue;

    const url = typeof item.url === "string" ? item.url.trim() : "";
    const domain = getDomainFromUrl(url);
    if (!domain) continue;

    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) continue;

    const description =
      typeof item.description === "string" ? item.description.trim() : "";

    const publishedAt =
      parsePublishedAt(item.page_age) ??
      parsePublishedAt(item.published) ??
      parsePublishedAt(item.date) ??
      parsePublishedAt(item.age);

    const scoreRaw =
      typeof item.score === "number" ? item.score : Number(item.score);
    const score = Number.isFinite(scoreRaw) ? clamp01(scoreRaw) : undefined;

    normalized.push({
      title,
      url,
      description,
      sourceDomain: domain,
      ...(publishedAt ? { publishedAt } : {}),
      ...(score !== undefined ? { score } : {}),
    });
  }

  return normalized;
}

export async function searchBrave(
  query: string,
  options: BraveSearchOptions = {},
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const apiKey = options.apiKey ?? process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new BraveAPIError("Missing BRAVE_API_KEY", 0);
  }

  const endpoint = options.endpoint ?? process.env.BRAVE_API_URL;
  if (!endpoint) {
    throw new BraveAPIError("Missing BRAVE_API_URL", 0);
  }

  const params = new URLSearchParams();
  params.set("q", q);
  params.set("source", "web");
  params.set("count", String(options.count ?? 10));

  if (typeof options.offset === "number" && options.offset >= 0) {
    params.set("offset", String(options.offset));
  }
  if (options.country) {
    params.set("country", options.country);
  }
  if (options.language) {
    params.set("search_lang", options.language);
  }
  if (options.freshness) {
    params.set("freshness", mapFreshnessParam(options.freshness));
  }

  const target = `${endpoint}?${params.toString()}`;
  const fetchImpl = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl(target, {
      method: "GET",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });
  } catch (error) {
    throw new BraveAPIError("Failed to reach Brave Search API", 0, error);
  }

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : undefined;
    throw new BraveRateLimitError(
      "Brave Search API rate limit exceeded",
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      await parseErrorBody(response),
    );
  }

  if (!response.ok) {
    throw new BraveAPIError(
      `Brave Search API request failed with status ${response.status}`,
      response.status,
      await parseErrorBody(response),
    );
  }

  let jsonPayload: unknown;
  try {
    jsonPayload = await response.json();
  } catch (error) {
    throw new BraveAPIError(
      "Brave Search API returned invalid JSON",
      response.status,
      error,
    );
  }

  return normalizeBraveResults(jsonPayload);
}

export default searchBrave;