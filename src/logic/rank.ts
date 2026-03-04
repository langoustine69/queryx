import type { SearchResult } from "./types";

export interface RankOptions {
  maxPerDomain?: number;
  maxResults?: number;
  minQualityScore?: number;
  now?: Date;
}

export interface RankedSearchResult extends SearchResult {
  rank: number;
  recencyBoost: number;
  qualityScore: number;
}

function normalizeDomain(value: string): string {
  return value.replace(/^www\./i, "").toLowerCase();
}

function getDomain(result: SearchResult): string {
  if (result.domain) return normalizeDomain(result.domain);
  try {
    return normalizeDomain(new URL(result.url).hostname);
  } catch {
    return "";
  }
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return `${normalizeDomain(parsed.hostname)}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function getRecencyBoost(publishedAt?: string, now = new Date()): number {
  if (!publishedAt) return 0;
  const publishedMs = Date.parse(publishedAt);
  if (Number.isNaN(publishedMs)) return 0;

  const ageDays = (now.getTime() - publishedMs) / (1000 * 60 * 60 * 24);

  if (ageDays < 0) return 0.18;
  if (ageDays <= 1) return 0.25;
  if (ageDays <= 7) return 0.18;
  if (ageDays <= 30) return 0.1;
  if (ageDays <= 90) return 0.05;
  if (ageDays <= 365) return 0.02;
  return 0;
}

export function qualityScore(result: SearchResult): number {
  const titleLen = result.title.trim().length;
  const descLen = result.description.trim().length;
  const hasValidUrl = /^https?:\/\//i.test(result.url);

  const titleScore = Math.max(0, Math.min(1, titleLen / 80));
  const descScore = Math.max(0, Math.min(1, descLen / 180));
  const urlBonus = hasValidUrl ? 0.05 : -0.15;
  const domainPenalty = result.domain ? 0 : 0.05;

  const score = titleScore * 0.45 + descScore * 0.5 + urlBonus - domainPenalty;
  return Math.max(0, Math.min(1, score));
}

export function isLowQuality(result: SearchResult, minQualityScore = 0.3): boolean {
  if (!result.title || !result.url || !result.description) return true;
  if (result.title.trim().length < 6) return true;
  if (result.description.trim().length < 20) return true;
  return qualityScore(result) < minQualityScore;
}

export function rankResults(
  results: SearchResult[],
  options: RankOptions = {},
): RankedSearchResult[] {
  const maxPerDomain = Math.max(1, options.maxPerDomain ?? 2);
  const maxResults = Math.max(1, options.maxResults ?? 10);
  const minQuality = options.minQualityScore ?? 0.3;
  const now = options.now ?? new Date();

  const seenCanonical = new Set<string>();
  const prepared: RankedSearchResult[] = [];

  for (const item of results) {
    const domain = getDomain(item);
    const candidate: SearchResult = { ...item, domain };

    if (isLowQuality(candidate, minQuality)) continue;

    const canonical = canonicalizeUrl(candidate.url);
    if (seenCanonical.has(canonical)) continue;
    seenCanonical.add(canonical);

    const recency = getRecencyBoost(candidate.publishedAt, now);
    const qScore = qualityScore(candidate);
    const base = candidate.score ?? 0.5;
    const rank = Math.max(0, Math.min(1.5, base * 0.65 + qScore * 0.25 + recency));

    prepared.push({
      ...candidate,
      rank,
      recencyBoost: recency,
      qualityScore: qScore,
      score: rank,
    });
  }

  prepared.sort((a, b) => b.rank - a.rank);

  const domainCounts = new Map<string, number>();
  const output: RankedSearchResult[] = [];

  for (const row of prepared) {
    const domain = row.domain || "";
    const current = domainCounts.get(domain) ?? 0;
    if (current >= maxPerDomain) continue;

    domainCounts.set(domain, current + 1);
    output.push(row);

    if (output.length >= maxResults) break;
  }

  return output;
}

export type { SearchResult };
export default rankResults;