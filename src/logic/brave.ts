export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  age?: string;
  score?: number;
}

export interface BraveSearchOptions {
  freshness?: Freshness;
  count?: number;
  offset?: number;
  country?: string;
  language?: string;
  safeSearch?: "strict" | "moderate" | "off";
  signal?: AbortSignal;
}

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  extra_snippets?: string[];
  age?: string;
  page_age?: string | { age?: string; last_modified?: string };
  score?: number;
}

export class BraveApiError extends Error {
  public readonly status: number;
  public readonly details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "BraveApiError";
    this.status = status;
    this.details = details;
  }
}

export class BraveRateLimitError extends BraveApiError {
  public readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, details?: string) {
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

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  if (value >= 0 && value <= 1) {
    return clamp01(value);
  }
  if (value > 1 && value <= 100) {
    return clamp01(value / 100);
  }
  return clamp01(value);
}

function parseRetryAfter(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const asInt = Number.parseInt(raw, 10);
  if (Number.isFinite(asInt) && asInt >= 0) {
    return asInt;
  }

  const dateMs = Date.parse(raw);
  if (Number.isNaN(dateMs)) {
    return undefined;
  }

  const seconds = Math.ceil((dateMs - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function normalizePublishedDate(pageAge: BraveWebResult["page_age"]): string | undefined {
  if (!pageAge) {
    return undefined;
  }

  if (typeof pageAge === "object" && typeof pageAge.last_modified === "string") {
    return pageAge.last_modified;
  }

  if (typeof pageAge === "string") {
    const parsed = Date.parse(pageAge);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function normalizeAge(raw: BraveWebResult): string | undefined {
  if (typeof raw.age === "string" && raw.age.trim() !== "") {
    return raw.age;
  }
  if (typeof raw.page_age === "object" && typeof raw.page_age.age === "string") {
    return raw.page_age.age;
  }
  return undefined;
}

function normalizeSnippet(raw: BraveWebResult): string {
  const chunks: string[] = [];
  if (typeof raw.description === "string" && raw.description.trim() !== "") {
    chunks.push(raw.description.trim());
  }
  if (Array.isArray(raw.extra_snippets)) {
    for (const snippet of raw.extra_snippets) {
      if (typeof snippet === "string" && snippet.trim() !== "") {
        chunks.push(snippet.trim());
      }
    }
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

function normalizeBraveResult(raw: BraveWebResult): SearchResult | null {
  if (typeof raw.url !== "string" || raw.url.trim() === "") {
    return null;
  }

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const snippet = normalizeSnippet(raw);

  if (title === "" && snippet === "") {
    return null;
  }

  return {
    title,
    url: raw.url,
    snippet,
    source: extractDomain(raw.url),
    publishedDate: normalizePublishedDate(raw.page_age),
    age: normalizeAge(raw),
    score: normalizeScore(raw.score),
  };
}

function buildRequestUrl(endpoint: string, params: URLSearchParams): string {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}${params.toString()}`;
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    return text.trim() === "" ? undefined : text;
  } catch {
    return undefined;
  }
}

export async function searchBrave(query: string, options: BraveSearchOptions = {}): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery === "") {
    return [];
  }

  const endpoint = process.env.BRAVE_API_URL;
  if (!endpoint) {
    throw new Error("BRAVE_API_URL is not configured.");
  }

  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_API_KEY is not configured.");
  }

  const params = new URLSearchParams();
  params.set("q", normalizedQuery);

  if (typeof options.count === "number" && Number.isFinite(options.count)) {
    params.set("count", String(Math.max(1, Math.floor(options.count))));
  }

  if (typeof options.offset === "number" && Number.isFinite(options.offset)) {
    params.set("offset", String(Math.max(0, Math.floor(options.offset))));
  }

  if (options.freshness) {
    params.set("freshness", FRESHNESS_MAP[options.freshness]);
  }

  if (options.country) {
    params.set("country", options.country);
  }

  if (options.language) {
    params.set("search_lang", options.language);
  }

  if (options.safeSearch) {
    params.set("safesearch", options.safeSearch);
  }

  const requestUrl = buildRequestUrl(endpoint, params);

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });

    if (response.status === 429) {
      const details = await safeReadText(response);
      const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
      throw new BraveRateLimitError("Brave API rate limit exceeded.", retryAfterSeconds, details);
    }

    if (!response.ok) {
      const details = await safeReadText(response);
      throw new BraveApiError(`Brave API request failed with status ${response.status}.`, response.status, details);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BraveApiError("Brave API returned invalid JSON.", response.status);
    }

    const rawResults = (payload as { web?: { results?: BraveWebResult[] } })?.web?.results;
    if (!Array.isArray(rawResults)) {
      return [];
    }

    return rawResults
      .map((item) => normalizeBraveResult(item))
      .filter((item): item is SearchResult => item !== null);
  } catch (error) {
    if (error instanceof BraveApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown fetch error";
    throw new BraveApiError(`Brave API network error: ${message}`, 0);
  }
}

export const braveSearch = searchBrave;
export default searchBrave;