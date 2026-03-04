export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  source?: string;
  publishedAt?: string | null;
  score?: number;
}