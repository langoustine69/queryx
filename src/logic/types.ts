export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
  source: string;
  publishedAt?: string;
  score?: number;
}

export interface TokenUsage {
  in: number;
  out: number;
}

export interface SynthesisResult {
  answer: string;
  confidence: number;
  tokens: TokenUsage;
  model: string;
}