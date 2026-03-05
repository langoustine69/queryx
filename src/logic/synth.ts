/**
 * GPT-4o-mini synthesis layer.
 * Takes query + search results, produces a concise answer with confidence scoring.
 */

import type { SearchResult } from "./brave";

export interface SynthResult {
  answer: string;
  confidence: number;
  tokens: { in: number; out: number };
  model: string;
}

const SYSTEM_PROMPT = `You are a search synthesis engine for AI agents. Given a query and search results, produce a concise, factual answer.

Rules:
- Be direct and factual. No filler, no hedging.
- Cite information from the provided sources.
- If sources disagree, note the disagreement.
- If sources are insufficient, say so clearly.
- Keep answers under 300 words unless the query demands more.
- Use ISO 8601 dates when referencing time.`;

function buildUserPrompt(query: string, sources: SearchResult[]): string {
  const sourceBlock = sources
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}${s.published ? `\nPublished: ${s.published}` : ""}`,
    )
    .join("\n\n");

  return `Query: ${query}\n\nSources:\n${sourceBlock}\n\nSynthesize an answer from these sources.`;
}

export function scoreConfidence(sources: SearchResult[]): number {
  if (sources.length === 0) return 0;

  let score = 0;

  // Base score from number of sources (max 0.4)
  score += Math.min(sources.length / 10, 0.4);

  // Snippet quality (max 0.3)
  const avgSnippetLen =
    sources.reduce((sum, s) => sum + (s.snippet?.length ?? 0), 0) /
    sources.length;
  score += Math.min(avgSnippetLen / 500, 0.3);

  // Source agreement - check overlap in snippets (max 0.2)
  if (sources.length >= 2) {
    const words0 = new Set(
      (sources[0].snippet ?? "").toLowerCase().split(/\s+/),
    );
    const words1 = new Set(
      (sources[1].snippet ?? "").toLowerCase().split(/\s+/),
    );
    const overlap = [...words0].filter((w) => words1.has(w)).length;
    const overlapRatio = overlap / Math.max(words0.size, 1);
    score += Math.min(overlapRatio, 0.2);
  }

  // Recency bonus (max 0.1)
  const hasPublished = sources.some((s) => s.published);
  if (hasPublished) score += 0.1;

  return Math.min(Math.max(score, 0), 1);
}

export async function synthesise(
  query: string,
  sources: SearchResult[],
): Promise<SynthResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const model = "gpt-4o-mini";
  const userPrompt = buildUserPrompt(query, sources);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}`,
    );
  }

  const body = await response.json();
  const choice = body.choices?.[0];
  const usage = body.usage ?? {};

  const answerText = choice?.message?.content;
  if (!answerText) {
    throw new Error("OpenAI returned an empty response");
  }
  return {
    answer: answerText,
    confidence: scoreConfidence(sources),
    tokens: { in: usage.prompt_tokens ?? 0, out: usage.completion_tokens ?? 0 },
    model,
  };
}
