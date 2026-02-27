/**
 * Source ranking and deduplication.
 * Deduplicates by domain, boosts recency, filters low quality.
 */

import type { SearchResult } from "./brave";

const SUSPICIOUS_DOMAINS = new Set([
  "pinterest.com",
  "quora.com",
  "slideshare.net",
  "scribd.com",
]);

const MAX_PER_DOMAIN = 2;

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Strip www.
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function recencyScore(published?: string): number {
  if (!published) return 0;

  try {
    const pubDate = new Date(published);
    const now = new Date();
    const ageMs = now.getTime() - pubDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // More recent = higher score (max 1.0 for today, decays over 90 days)
    return Math.max(0, 1 - ageDays / 90);
  } catch {
    return 0;
  }
}

function qualityScore(result: SearchResult): number {
  let score = 0;

  // Has snippet (essential)
  if (result.snippet && result.snippet.length > 20) {
    score += 0.4;
  } else {
    return 0; // No snippet = filtered out
  }

  // Snippet length bonus
  score += Math.min(result.snippet.length / 500, 0.2);

  // Has title
  if (result.title && result.title.length > 5) {
    score += 0.1;
  }

  // Recency
  score += recencyScore(result.published) * 0.2;

  // Existing relevance score from Brave
  if (result.score) {
    score += Math.min(result.score, 0.1);
  }

  return score;
}

export function rank(
  results: SearchResult[],
  topN?: number,
): SearchResult[] {
  const n = topN ?? 10;

  // Filter suspicious domains and low quality
  const filtered = results.filter((r) => {
    const domain = extractDomain(r.url);
    if (SUSPICIOUS_DOMAINS.has(domain)) return false;
    if (!r.snippet || r.snippet.length < 20) return false;
    return true;
  });

  // Score and sort
  const scored = filtered.map((r) => ({
    result: r,
    score: qualityScore(r),
  }));
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by domain (max 2 per domain)
  const domainCount = new Map<string, number>();
  const deduped: SearchResult[] = [];

  for (const { result } of scored) {
    const domain = extractDomain(result.url);
    const count = domainCount.get(domain) ?? 0;
    if (count >= MAX_PER_DOMAIN) continue;
    domainCount.set(domain, count + 1);
    deduped.push(result);
    if (deduped.length >= n) break;
  }

  return deduped;
}
