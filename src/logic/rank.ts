import type { SearchResult } from "./brave";

export interface RankedSearchResult extends SearchResult {
  qualityScore: number;
  recencyScore: number;
  score: number;
}

export interface RankOptions {
  now?: Date;
  maxPerDomain?: number;
  limit?: number;
  minQuality?: number;
  recencyHalfLifeDays?: number;
}

function normalizeDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "";
  }
}

function qualityScore(result: SearchResult): number {
  const titleLen = result.title.trim().length;
  const snippetLen = result.snippet.trim().length;
  const hasValidUrl = /^https?:\/\//i.test(result.url.trim());

  if (!titleLen || !snippetLen || !hasValidUrl) {
    return 0;
  }

  const titleComponent = Math.min(titleLen / 80, 1) * 0.35;
  const snippetComponent = Math.min(snippetLen / 240, 1) * 0.45;
  const urlComponent = 0.2;

  let score = titleComponent + snippetComponent + urlComponent;

  if (snippetLen < 40) {
    score *= 0.6;
  }

  if (/\/(tag|category|author)\//i.test(result.url)) {
    score *= 0.85;
  }

  return Math.max(0, Math.min(1, score));
}

function recencyScore(publishedAt: string | undefined, now: Date, halfLifeDays: number): number {
  if (!publishedAt) {
    return 0.2;
  }

  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) {
    return 0.2;
  }

  const ageMs = Math.max(0, now.getTime() - ts);
  const ageDays = ageMs / 86_400_000;
  const lambda = Math.log(2) / Math.max(1, halfLifeDays);

  return Math.exp(-lambda * ageDays);
}

function scoreResult(result: SearchResult, now: Date, halfLifeDays: number): RankedSearchResult {
  const q = qualityScore(result);
  const r = recencyScore(result.publishedAt, now, halfLifeDays);
  const score = q * 0.7 + r * 0.3;

  return {
    ...result,
    sourceDomain: result.sourceDomain || normalizeDomain(result.url),
    qualityScore: q,
    recencyScore: r,
    score,
  };
}

export function rankResults(results: SearchResult[], options: RankOptions = {}): RankedSearchResult[] {
  const now = options.now ?? new Date();
  const maxPerDomain = options.maxPerDomain ?? 2;
  const limit = options.limit ?? 10;
  const minQuality = options.minQuality ?? 0.3;
  const halfLifeDays = options.recencyHalfLifeDays ?? 14;

  const scored = results
    .map((r) => scoreResult(r, now, halfLifeDays))
    .filter((r) => r.qualityScore >= minQuality && Boolean(r.sourceDomain));

  scored.sort((a, b) => b.score - a.score);

  const domainCounts = new Map<string, number>();
  const ranked: RankedSearchResult[] = [];

  for (const result of scored) {
    const domain = result.sourceDomain;
    const count = domainCounts.get(domain) ?? 0;

    if (count >= maxPerDomain) {
      continue;
    }

    domainCounts.set(domain, count + 1);
    ranked.push(result);

    if (ranked.length >= limit) {
      break;
    }
  }

  return ranked;
}