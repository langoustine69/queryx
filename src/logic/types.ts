export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
  publishedAt?: string;
  score?: number;
  source?: string;
}