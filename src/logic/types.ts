export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  source: string;
  domain: string;
  publishedAt?: string;
  favicon?: string;
  score?: number;
}