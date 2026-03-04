import type { SearchResult } from "./brave";

export interface RankOptions {
  maxPerDomain?: number;
  maxResults?: number;
  minQualityScore?: number;
  now?: Date;
}

export interface RankedSearchResult extends SearchResult {
  rankScore: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function canonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      const k = key.toLowerCase();
      if (k.startsWith("utm_") || k === "fbclid" || k === "gclid" || k === "ref") {
        url.searchParams.delete(key);
      }
    }
    url.pathname = url.pathname.replace(/\/+$/g, "") || "/";
    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

function recencyBoost(publishedAt: string | undefined, now: Date): number {
  if (!publishedAt) return 0;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 0;

  const ageMs = now.getTime() - date.getTime();
  if (ageMs < 0) return 0.3;
  const day = 24 * 60 * 60 * 1000;
  if (ageMs <= day) return 0.35;
  if (ageMs <= 7 * day) return 0.22;
  if (ageMs <= 30 * day) return 0.12;
  if (ageMs <= 180 * day) return 0.05;
  return 0;
}

function isLowQuality(result: SearchResult): boolean {
  if (!result.url || !result.domain) return true;
  const title = result.title?.trim() ?? "";
  const snippet = result.snippet?.trim() ?? "";

  if (title.length < 8) return true;
  if (snippet.length < 20) return true;

  return false;
}

function qualityScore(result: SearchResult, now: Date): number {
  const titleLen = (result.title ?? "").trim().length;
  const snippetLen = (result.snippet ?? "").trim().length;
  const titleScore = Math.min(titleLen, 120) / 120 * 0.35;
  const snippetScore = Math.min(snippetLen, 300) / 300 * 0.45;
  const sourceScore = result.domain ? 0.1 : 0;
  const explicitScore = clamp01(Number(result.score ?? 0)) * 0.2;
  const freshness = recencyBoost(result.publishedAt, now);
  return titleScore + snippetScore + sourceScore + explicitScore + freshness;
}

export function rankSearchResults(
  results: SearchResult[],
  options: RankOptions = {}
): SearchResult[] {
  const maxPerDomain = options.maxPerDomain ?? 2;
  const maxResults = options.maxResults ?? 10;
  const minQualityScore = options.minQualityScore ?? 0.25;
  const now = options.now ?? new Date();

  const seenUrls = new Set<string>();
  const seenTitleDomain = new Set<string>();
  const ranked: RankedSearchResult[] = [];

  for (const result of results) {
    const canonical = canonicalUrl(result.url);
    if (seenUrls.has(canonical)) continue;
    seenUrls.add(canonical);

    const titleDomainKey = `${result.domain}|${result.title.trim().toLowerCase()}`;
    if (seenTitleDomain.has(titleDomainKey)) continue;
    seenTitleDomain.add(titleDomainKey);

    if (isLowQuality(result)) continue;

    const rankScore = qualityScore(result, now);
    if (rankScore < minQualityScore) continue;

    ranked.push({
      ...result,
      rankScore,
    });
  }

  ranked.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bd - ad;
  });

  const perDomain = new Map<string, number>();
  const output: SearchResult[] = [];

  for (const item of ranked) {
    const domain = item.domain.toLowerCase();
    const current = perDomain.get(domain) ?? 0;
    if (current >= maxPerDomain) continue;

    perDomain.set(domain, current + 1);
    const { rankScore: _unused, ...result } = item;
    output.push(result);

    if (output.length >= maxResults) break;
  }

  return output;
}

export default rankSearchResults;