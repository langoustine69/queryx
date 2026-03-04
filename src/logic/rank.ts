import { SearchResult } from "./types";

export interface RankOptions {
  maxPerDomain?: number;
  minQualityScore?: number;
  now?: Date;
}

export interface RankedSearchResult extends SearchResult {
  qualityScore: number;
  recencyScore: number;
  rankScore: number;
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return "";
  }
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }
    const pathname = parsed.pathname.replace(/\/+$/, "");
    const query = parsed.searchParams.toString();
    return `${parsed.origin}${pathname}${query ? `?${query}` : ""}`;
  } catch {
    return url.trim();
  }
}

export function qualityScore(result: SearchResult): number {
  let score = 0;

  const titleLength = result.title.trim().length;
  const snippetLength = result.snippet.trim().length;

  if (titleLength >= 12) score += 0.35;
  else if (titleLength >= 6) score += 0.2;

  if (snippetLength >= 80) score += 0.35;
  else if (snippetLength >= 30) score += 0.2;

  if (/^https?:\/\//i.test(result.url)) score += 0.15;
  if (result.domain.includes(".")) score += 0.1;

  if (/(login|signup|privacy|terms|cookie)/i.test(result.url)) {
    score -= 0.2;
  }

  if (typeof result.score === "number") {
    score += 0.05 * clamp(result.score);
  }

  return clamp(score);
}

export function recencyScore(publishedAt: string | undefined, now = new Date()): number {
  if (!publishedAt) return 0.3;

  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return 0.3;

  const ageDays = (now.getTime() - ts) / 86_400_000;
  if (ageDays <= 0) return 1;

  return clamp(Math.exp(-ageDays / 30));
}

export function rankResults(results: SearchResult[], options: RankOptions = {}): RankedSearchResult[] {
  const maxPerDomain = options.maxPerDomain ?? 2;
  const minQualityScore = options.minQualityScore ?? 0.35;
  const now = options.now ?? new Date();

  const seenUrls = new Set<string>();
  const candidates: RankedSearchResult[] = [];

  for (const input of results) {
    if (!input?.title || !input?.url) continue;

    const normalizedUrl = canonicalizeUrl(input.url);
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    const domain = (input.domain || extractDomain(input.url)).toLowerCase();
    if (!domain) continue;

    const materialized: SearchResult = {
      ...input,
      domain,
      url: normalizedUrl,
    };

    const qScore = qualityScore(materialized);
    if (qScore < minQualityScore) continue;

    const rScore = recencyScore(materialized.publishedAt, now);
    const sourceScore = typeof materialized.score === "number" ? clamp(materialized.score) : 0.5;
    const rankScore = clamp(0.6 * qScore + 0.25 * rScore + 0.15 * sourceScore);

    candidates.push({
      ...materialized,
      qualityScore: qScore,
      recencyScore: rScore,
      rankScore,
    });
  }

  candidates.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return b.recencyScore - a.recencyScore;
  });

  const perDomainCount = new Map<string, number>();
  const output: RankedSearchResult[] = [];

  for (const candidate of candidates) {
    const used = perDomainCount.get(candidate.domain) ?? 0;
    if (used >= maxPerDomain) continue;

    perDomainCount.set(candidate.domain, used + 1);
    output.push(candidate);
  }

  return output;
}

export const rank = rankResults;
export default rankResults;