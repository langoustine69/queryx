import { z } from "zod";

export const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  snippet: z.string(),
  published: z.iso.datetime().optional(),
});

export const FreshnessSchema = z.object({
  fetchedAt: z.iso.datetime(),
  resultsAge: z.string(),
});

export const TokenUsageSchema = z.object({
  in: z.number().int().nonnegative(),
  out: z.number().int().nonnegative(),
});

export const SearchResponseSchema = z.object({
  query: z.string().min(1),
  answer: z.string(),
  sources: z.array(SourceSchema),
  confidence: z.number().min(0).max(1),
  freshness: FreshnessSchema,
  model: z.string().min(1),
  tokens: TokenUsageSchema,
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1, "Query is required"),
});

export const DeepSearchRequestSchema = z.object({
  query: z.string().trim().min(1, "Query is required"),
  depth: z.enum(["standard", "deep"]).default("deep"),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type DeepSearchRequest = z.infer<typeof DeepSearchRequestSchema>;

export const searchResponseJsonSchema = z.toJSONSchema(SearchResponseSchema);
