/**
 * Zod v4 schemas for all Queryx API endpoints.
 */
import { z } from "zod";

export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  published: z.string().optional(),
});

export const FreshnessSchema = z.object({
  fetchedAt: z.string(),
  resultsAge: z.string(),
});

export const TokensSchema = z.object({
  in: z.number().int().nonnegative(),
  out: z.number().int().nonnegative(),
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  answer: z.string(),
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(1),
  freshness: FreshnessSchema,
  model: z.string(),
  tokens: TokensSchema,
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  count: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export const DeepSearchBodySchema = z.object({
  query: z.string().min(1),
  sources: z.number().int().min(1).max(10).optional().default(5),
});

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  status: z.number(),
});

export const HealthSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  uptime: z.number(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type ErrorResponse = z.infer<typeof ErrorSchema>;
