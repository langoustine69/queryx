export type SearchFreshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
  score?: number;
  source?: string;
}