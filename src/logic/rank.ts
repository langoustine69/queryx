import type { SearchResult } from "./brave";

export interface RankedSearchResult extends SearchResult {
  score: number;
}

export interface RankOptions {
  maxPerDomain?: number;
  minQualityScore?: number;
  now?: Date;
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid"
]);

function normalizeDomain(url: string, existing?: string): string {
  if (existing && existing.trim()) return existing.trim().toLowerCase();
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "";
  }
}

export function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";

    const kept = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        kept.append(key, value);
      }
    }

    url.search = kept.toString();
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

function isLowQuality(result: SearchResult): boolean {
  const titleLen = result.title.trim().length;
  const snippetLen = result.snippet.trim().length;

  if (!result.url || titleLen < 8) return true;
  if (snippetLen < 25) return true;
  if (/^(home|index|untitled)$/i.test(result.title.trim())) return true;

  return false;
}

function recencyBoost(publishedAt: string | undefined, now: Date): number {
  if (!publishedAt) return 0;

  const timestamp = new Date(publishedAt).getTime();
  if (Number.isNaN(timestamp)) return 0;

  const ageDays = (now.getTime() - timestamp) / (1000 * 60 * 60 * 24);

  if (ageDays < 0) return 0.02;
  if (ageDays <= 1) return 0.25;
  if (ageDays <= 7) return 0.18;
  if (ageDays <= 30) return 0.12;
  if (ageDays <= 90) return 0.06;
  return 0;
}

function qualityScore(result: SearchResult): number {
  const titleScore = Math.min(1, result.title.trim().length / 90) * 0.25;
  const snippetScore = Math.min(1, result.snippet.trim().length / 260) * 0.5;
  const httpsScore = result.url.startsWith("https://") ? 0.05 : 0;
  const domainScore = result.domain ? 0.1 : 0;

  return titleScore + snippetScore + httpsScore + domainScore;
}

export function rankResults(results: SearchResult[], options: RankOptions = {}): RankedSearchResult[] {
  const maxPerDomain = options.maxPerDomain ?? 2;
  const minQualityScore = options.minQualityScore ?? 0.35;
  const now = options.now ?? new Date();

  const seenUrls = new Set<string>();
  const filtered: SearchResult[] = [];

  for (const result of results) {
    if (isLowQuality(result)) continue;

    const canonicalUrl = canonicalizeUrl(result.url);
    if (seenUrls.has(canonicalUrl)) continue;

    seenUrls.add(canonicalUrl);
    filtered.push({
      ...result,
      domain: normalizeDomain(result.url, result.domain)
    });
  }

  const scored: RankedSearchResult[] = filtered
    .map((result) => {
      const score = qualityScore(result) + recencyBoost(result.publishedAt, now);
      return {
        ...result,
        score: Number(score.toFixed(6))
      };
    })
    .filter((result) => result.score >= minQualityScore)
    .sort((a, b) => b.score - a.score);

  const perDomainCount = new Map<string, number>();
  const output: RankedSearchResult[] = [];

  for (const result of scored) {
    const domain = result.domain || "unknown";
    const current = perDomainCount.get(domain) ?? 0;

    if (current >= maxPerDomain) {
      continue;
    }

    perDomainCount.set(domain, current + 1);
    output.push(result);
  }

  return output;
}

export default {
  rankResults,
  canonicalizeUrl
};