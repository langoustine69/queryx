import type { SearchResult } from "./brave";

export interface RankedSearchResult extends SearchResult {
  domain: string;
  rankScore: number;
  canonicalUrl: string;
}

export interface RankOptions {
  maxPerDomain?: number;
  limit?: number;
  now?: Date;
}

const TRACKING_PARAM_NAMES = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "igshid", "ref", "ref_src"]);
const LOW_QUALITY_DOMAIN_FRAGMENTS = ["pinterest.", "quora.", "reddit."];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function canonicalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || TRACKING_PARAM_NAMES.has(key)) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    const normalized = url.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function parseRelativeAgeToDays(age: string): number | undefined {
  const match = age.toLowerCase().match(/(\d+)\s*(minute|hour|day|week|month|year)/);
  if (!match) {
    return undefined;
  }

  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }

  const unit = match[2];
  switch (unit) {
    case "minute":
      return value / (24 * 60);
    case "hour":
      return value / 24;
    case "day":
      return value;
    case "week":
      return value * 7;
    case "month":
      return value * 30;
    case "year":
      return value * 365;
    default:
      return undefined;
  }
}

function recencyBoost(result: SearchResult, nowMs: number): number {
  if (result.publishedDate) {
    const publishedMs = Date.parse(result.publishedDate);
    if (!Number.isNaN(publishedMs) && publishedMs <= nowMs) {
      const ageDays = (nowMs - publishedMs) / (1000 * 60 * 60 * 24);
      if (ageDays <= 1) return 0.25;
      if (ageDays <= 7) return 0.2;
      if (ageDays <= 30) return 0.12;
      if (ageDays <= 180) return 0.06;
      if (ageDays <= 365) return 0.03;
      return 0;
    }
  }

  if (result.age) {
    const ageDays = parseRelativeAgeToDays(result.age);
    if (typeof ageDays === "number") {
      if (ageDays <= 1) return 0.22;
      if (ageDays <= 7) return 0.18;
      if (ageDays <= 30) return 0.1;
      if (ageDays <= 180) return 0.05;
    }
  }

  return 0;
}

function qualityScore(result: SearchResult): number {
  const title = result.title.trim();
  const snippet = result.snippet.trim();
  const domain = extractDomain(result.url);

  let score = 0;

  if (title.length >= 12) score += 0.3;
  else if (title.length >= 6) score += 0.16;

  if (snippet.length >= 60) score += 0.34;
  else if (snippet.length >= 25) score += 0.2;

  if (/^https:\/\//i.test(result.url)) score += 0.1;

  const isLowQualityDomain = LOW_QUALITY_DOMAIN_FRAGMENTS.some((fragment) => domain.includes(fragment));
  if (!isLowQualityDomain) score += 0.12;
  else score -= 0.2;

  const snippetWords = snippet.split(/\s+/).filter(Boolean).length;
  if (snippetWords >= 10) score += 0.1;

  if (typeof result.score === "number") {
    score += clamp01(result.score) * 0.14;
  }

  return clamp01(score);
}

function isLowQuality(result: SearchResult): boolean {
  const quality = qualityScore(result);
  if (quality < 0.35) {
    return true;
  }

  const lowerUrl = result.url.toLowerCase();
  if (lowerUrl.includes("/search?") || lowerUrl.includes("/tag/") || lowerUrl.includes("/login")) {
    return true;
  }

  return false;
}

function computeRankScore(result: SearchResult, nowMs: number): number {
  const quality = qualityScore(result);
  const recency = recencyBoost(result, nowMs);
  return clamp01(quality + recency);
}

export function rankAndDedup(results: SearchResult[], options: RankOptions = {}): RankedSearchResult[] {
  const nowMs = (options.now ?? new Date()).getTime();
  const maxPerDomain = options.maxPerDomain ?? 2;
  const limit = options.limit ?? Number.MAX_SAFE_INTEGER;

  const dedupMap = new Map<string, RankedSearchResult>();

  for (const result of results) {
    if (isLowQuality(result)) {
      continue;
    }

    const canonicalUrl = canonicalizeUrl(result.url);
    const domain = extractDomain(result.url);
    const rankScore = computeRankScore(result, nowMs);

    const ranked: RankedSearchResult = {
      ...result,
      canonicalUrl,
      domain,
      rankScore,
    };

    const existing = dedupMap.get(canonicalUrl);
    if (!existing || ranked.rankScore > existing.rankScore) {
      dedupMap.set(canonicalUrl, ranked);
    }
  }

  const sorted = [...dedupMap.values()].sort((a, b) => b.rankScore - a.rankScore);

  const output: RankedSearchResult[] = [];
  const domainCounts = new Map<string, number>();

  for (const item of sorted) {
    const currentCount = domainCounts.get(item.domain) ?? 0;
    if (currentCount >= maxPerDomain) {
      continue;
    }

    output.push(item);
    domainCounts.set(item.domain, currentCount + 1);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

export const rankResults = rankAndDedup;
export default rankAndDedup;