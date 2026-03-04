export type Freshness = "day" | "week" | "month";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedAt?: string;
  score?: number;
  source?: string;
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