import type { SearchResult } from "./types";

const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
]);

export interface RankOptions {
  maxPerDomain?: number;
  minDescriptionLength?: number;
  now?: Date;
}

export type RankedSearchResult = SearchResult & { rankScore: number };

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

export function canonicalizeUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    const trimmedPath = url.pathname.replace(/\/+$/, "");
    url.pathname = trimmedPath || "/";
    return url.toString();
  } catch {
    return input.trim();
  }
}

export function recencyBoost(publishedAt: string | undefined, now: Date = new Date()): number {
  if (!publishedAt) {
    return 0;
  }

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const ageMs = now.getTime() - date.getTime();
  if (ageMs < 0) {
    return 0.2;
  }

  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  if (ageDays <= 1) return 0.25;
  if (ageDays <= 7) return 0.16;
  if (ageDays <= 30) return 0.08;
  if (ageDays <= 90) return 0.03;
  return 0;
}

export function isLowQualityResult(result: SearchResult, minDescriptionLength = 40): boolean {
  if (!result.title?.trim()) return true;
  if (!result.url?.trim()) return true;
  if (!result.description?.trim()) return true;
  if (result.title.trim().length < 4) return true;
  if (result.description.trim().length < minDescriptionLength) return true;
  if (!/^https?:\/\//i.test(result.url.trim())) return true;
  if (!extractDomain(result.url)) return true;
  return false;
}

function qualityScore(result: SearchResult, now: Date): number {
  const base = typeof result.score === "number" ? result.score : 0.5;
  const descriptionBoost = Math.min(0.2, result.description.trim().length / 500);
  const titleBoost = Math.min(0.1, result.title.trim().length / 120);
  const httpsBoost = result.url.startsWith("https://") ? 0.03 : 0;
  return base + descriptionBoost + titleBoost + httpsBoost + recencyBoost(result.publishedAt, now);
}

function normalizeResult(result: SearchResult): SearchResult {
  const domain = result.domain?.trim().toLowerCase() || extractDomain(result.url);
  const source = result.source?.trim() || domain;
  return {
    ...result,
    domain,
    source,
  };
}

export function rankResults(results: SearchResult[], options: RankOptions = {}): RankedSearchResult[] {
  const maxPerDomain = options.maxPerDomain ?? 2;
  const minDescriptionLength = options.minDescriptionLength ?? 40;
  const now = options.now ?? new Date();

  const deduped = new Map<string, SearchResult>();

  for (const raw of results) {
    const result = normalizeResult(raw);
    if (isLowQualityResult(result, minDescriptionLength)) {
      continue;
    }

    const canonicalUrl = canonicalizeUrl(result.url);
    const existing = deduped.get(canonicalUrl);

    if (!existing) {
      deduped.set(canonicalUrl, result);
      continue;
    }

    if (qualityScore(result, now) > qualityScore(existing, now)) {
      deduped.set(canonicalUrl, result);
    }
  }

  const ranked = [...deduped.values()]
    .map((result) => ({
      ...result,
      rankScore: qualityScore(result, now),
    }))
    .sort((a, b) => b.rankScore - a.rankScore);

  const domainCounts = new Map<string, number>();
  const limited: RankedSearchResult[] = [];

  for (const result of ranked) {
    const domain = result.domain || extractDomain(result.url);
    if (!domain) {
      continue;
    }

    const count = domainCounts.get(domain) ?? 0;
    if (count >= maxPerDomain) {
      continue;
    }

    domainCounts.set(domain, count + 1);
    limited.push(result);
  }

  return limited;
}

export const rankAndDedupResults = rankResults;

export type { SearchResult };
export default rankResults;