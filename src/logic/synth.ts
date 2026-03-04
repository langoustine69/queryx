import type { SearchResult } from "./types";

export interface SynthTokens {
  in: number;
  out: number;
}

export interface SynthResult {
  answer: string;
  confidence: number;
  tokens: SynthTokens;
  model: string;
}

export interface SynthOptions {
  model?: string;
  temperature?: number;
  maxInputResults?: number;
  signal?: AbortSignal;
  endpoint?: string;
}

export class SynthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SynthError";
    this.status = status;
  }
}

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "You are Queryx synthesis engine.",
  "Return strict JSON only with shape:",
  '{"answer":"string","confidence":number}.',
  "Make answer concise and directly useful for agent consumers.",
  "Use only provided sources, avoid speculation, no markdown.",
].join(" ");

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function heuristicConfidence(results: SearchResult[], answer: string): number {
  const sourceFactor = Math.min(0.55, results.length * 0.1);
  const averageSnippetLength =
    results.length === 0
      ? 0
      : results.reduce((sum, item) => sum + item.snippet.trim().length, 0) / results.length;
  const evidenceFactor = Math.min(0.25, averageSnippetLength / 220);
  const answerPenalty = answer.trim().length < 30 ? 0.15 : 0;
  return clamp01(0.2 + sourceFactor + evidenceFactor - answerPenalty);
}

function buildUserPrompt(query: string, results: SearchResult[]): string {
  const compactResults = results.map((result, index) => ({
    id: index + 1,
    title: result.title,
    url: result.url,
    domain: result.domain,
    snippet: result.snippet,
    publishedAt: result.publishedAt ?? null,
  }));

  return JSON.stringify({
    query,
    results: compactResults,
    instructions: "Synthesize a direct answer and confidence based only on these results.",
  });
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  options: SynthOptions = {},
): Promise<SynthResult> {
  const model = options.model ?? DEFAULT_MODEL;

  if (results.length === 0) {
    return {
      answer: "No relevant sources were provided.",
      confidence: 0,
      tokens: { in: 0, out: 0 },
      model,
    };
  }

  const endpoint = options.endpoint ?? process.env.OPENAI_API_URL?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!endpoint) {
    throw new SynthError("OPENAI_API_URL is not set");
  }

  if (!apiKey) {
    throw new SynthError("OPENAI_API_KEY is not set");
  }

  const maxInputResults = options.maxInputResults ?? 8;
  const selectedResults = results.slice(0, Math.max(1, maxInputResults));
  const userPrompt = buildUserPrompt(query, selectedResults);

  const requestBody = {
    model,
    temperature: options.temperature ?? 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new SynthError(`Failed to call synthesis model: ${message}`);
  }

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "";
    }
    const suffix = body ? `: ${body}` : "";
    throw new SynthError(`Synthesis request failed (${response.status})${suffix}`, response.status);
  }

  type CompletionPayload = {
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
    };
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  let payload: CompletionPayload;
  try {
    payload = (await response.json()) as CompletionPayload;
  } catch {
    throw new SynthError("Synthesis model returned invalid JSON");
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new SynthError("Synthesis response did not include message content");
  }

  const parsed = safeJsonParse<Record<string, unknown>>(content);
  const answerFromJson = parsed && typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  const answer = answerFromJson || content.trim();

  const confidenceFromJson = parsed ? toNumber(parsed.confidence) : undefined;
  const confidence =
    confidenceFromJson === undefined
      ? heuristicConfidence(selectedResults, answer)
      : clamp01(confidenceFromJson);

  const promptTokens = toNumber(payload.usage?.prompt_tokens) ?? estimateTokens(SYSTEM_PROMPT + userPrompt);
  const completionTokens = toNumber(payload.usage?.completion_tokens) ?? estimateTokens(answer);

  return {
    answer,
    confidence,
    tokens: {
      in: promptTokens,
      out: completionTokens,
    },
    model: typeof payload.model === "string" && payload.model ? payload.model : model,
  };
}

export type { SearchResult } from "./types";
export default synthesizeAnswer;