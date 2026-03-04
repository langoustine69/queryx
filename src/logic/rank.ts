import type { SearchResult } from "./types";

export interface RankOptions {
  maxPerDomain?: number;
  minSnippetLength?: number;
  minTitleLength?: number;
  now?: Date;
}

const TRACKING_PARAM_EXACT = new Set([
  "fbclid",
  "gclid",
  "ref",
  "source",
  "mc_cid",
  "mc_eid",
]);

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function canonicalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.hash = "";

    const keys = [...parsed.searchParams.keys()];
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_PARAM_EXACT.has(lower)) {
        parsed.searchParams.delete(key);
      }
    }

    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    const query = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return null;
  }
}

function toTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function recencyBoost(publishedAt: string | null | undefined, now: Date): number {
  const ts = toTimestamp(publishedAt);
  if (ts === null) return 0;

  const ageMs = Math.max(0, now.getTime() - ts);
  const days = ageMs / (1000 * 60 * 60 * 24);

  if (days <= 1) return 0.35;
  if (days <= 7) return 0.25;
  if (days <= 30) return 0.15;
  if (days <= 90) return 0.08;
  if (days <= 365) return 0.03;
  return 0;
}

function qualityScore(result: SearchResult): number {
  const titleLen = result.title.trim().length;
  const snippetLen = result.snippet.trim().length;

  const titleScore = Math.min(120, titleLen) / 120 * 0.3;
  const snippetScore = Math.min(320, snippetLen) / 320 * 0.45;
  const httpsBoost = result.url.startsWith("https://") ? 0.05 : 0;
  const authorityBoost = /\.(gov|edu)$/.test(result.domain) ? 0.05 : 0;

  return titleScore + snippetScore + httpsBoost + authorityBoost;
}

function isLowQuality(
  result: SearchResult,
  minTitleLength: number,
  minSnippetLength: number,
): boolean {
  if (!result.title || !result.url) return true;
  if (result.title.trim().length < minTitleLength) return true;
  if (result.snippet.trim().length < minSnippetLength) return true;
  return canonicalizeUrl(result.url) === null;
}

function pickPreferred(existing: SearchResult, incoming: SearchResult): SearchResult {
  const existingTs = toTimestamp(existing.publishedAt ?? null) ?? 0;
  const incomingTs = toTimestamp(incoming.publishedAt ?? null) ?? 0;

  if (incomingTs > existingTs) return incoming;
  if (incomingTs < existingTs) return existing;

  return incoming.snippet.length > existing.snippet.length ? incoming : existing;
}

export function rankResults(results: SearchResult[], options: RankOptions = {}): SearchResult[] {
  if (!Array.isArray(results) || results.length === 0) return [];

  const now = options.now ?? new Date();
  const maxPerDomain = options.maxPerDomain ?? 2;
  const minSnippetLength = options.minSnippetLength ?? 40;
  const minTitleLength = options.minTitleLength ?? 8;

  const byCanonicalUrl = new Map<string, SearchResult>();

  for (const result of results) {
    if (isLowQuality(result, minTitleLength, minSnippetLength)) continue;

    const canonicalUrl = canonicalizeUrl(result.url);
    if (!canonicalUrl) continue;

    const domain = (result.domain || extractDomain(canonicalUrl) || "").toLowerCase();
    if (!domain) continue;

    const normalized: SearchResult = {
      ...result,
      url: canonicalUrl,
      domain,
    };

    const existing = byCanonicalUrl.get(canonicalUrl);
    if (!existing) {
      byCanonicalUrl.set(canonicalUrl, normalized);
    } else {
      byCanonicalUrl.set(canonicalUrl, pickPreferred(existing, normalized));
    }
  }

  const scored = [...byCanonicalUrl.values()]
    .map((result) => ({
      ...result,
      score: qualityScore(result) + recencyBoost(result.publishedAt, now),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const domainCounts = new Map<string, number>();
  const ranked: SearchResult[] = [];

  for (const result of scored) {
    const count = domainCounts.get(result.domain) ?? 0;
    if (count >= maxPerDomain) continue;
    domainCounts.set(result.domain, count + 1);
    ranked.push(result);
  }

  return ranked;
}

export { canonicalizeUrl };
export type { SearchResult } from "./types";
export default rankResults;