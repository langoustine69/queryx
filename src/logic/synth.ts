import type { SearchResult } from "./brave";

export interface SynthTokenUsage {
  in: number;
  out: number;
}

export interface SynthResult {
  answer: string;
  confidence: number;
  tokens: SynthTokenUsage;
  model: string;
}

export interface SynthOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

interface OpenAIChatResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class SynthError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "SynthError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_MODEL = process.env.SYNTH_MODEL ?? "gpt-4o-mini";
const DEFAULT_ENDPOINT = process.env.OPENAI_API_ENDPOINT ?? "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = [
  "You are Queryx synthesis engine.",
  "Your audience is autonomous agents that need concise, factual summaries from search results.",
  "Rules:",
  "1) Return strict JSON only: {\"answer\":\"string\",\"confidence\":number}.",
  "2) Answer in 2-5 short sentences. No markdown.",
  "3) Confidence must be between 0 and 1.",
  "4) If evidence is weak or conflicting, say so and lower confidence."
].join("\n");

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 1;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

function stripCodeFence(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return content.trim();
}

function parseModelJson(content: string): Record<string, unknown> {
  const stripped = stripCodeFence(content);

  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    const objectMatch = stripped.match(/\{[\s\S]*\}/);
    if (!objectMatch) return {};
    try {
      return JSON.parse(objectMatch[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function fallbackAnswer(query: string, results: SearchResult[]): string {
  if (!results.length) {
    return `No reliable sources were found for "${query}".`;
  }

  const top = results.slice(0, 3);
  const bulletText = top
    .map((r) => r.snippet || r.title)
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!bulletText) {
    return `Found ${results.length} sources for "${query}", but snippets were too sparse to synthesize strongly.`;
  }

  return bulletText.slice(0, 600);
}

function heuristicConfidence(query: string, results: SearchResult[], answer: string): number {
  if (!results.length) return 0.1;

  const uniqueDomains = new Set(results.map((r) => r.domain).filter(Boolean)).size;
  const domainScore = Math.min(1, uniqueDomains / Math.min(results.length, 6)) * 0.2;

  const snippetCoverage =
    results.filter((r) => (r.snippet ?? "").trim().length >= 40).length / Math.max(1, results.length);
  const snippetScore = snippetCoverage * 0.3;

  const now = Date.now();
  const recentCount = results.filter((r) => {
    if (!r.publishedAt) return false;
    const ts = new Date(r.publishedAt).getTime();
    if (Number.isNaN(ts)) return false;
    const ageDays = (now - ts) / (1000 * 60 * 60 * 24);
    return ageDays <= 30;
  }).length;
  const recencyScore = (recentCount / Math.max(1, results.length)) * 0.2;

  const volumeScore = Math.min(1, results.length / 8) * 0.2;
  const answerScore = Math.min(1, answer.trim().length / 240) * 0.1;

  const uncertaintyPenalty = query.trim().length < 3 ? 0.15 : 0;

  return clampConfidence(domainScore + snippetScore + recencyScore + volumeScore + answerScore - uncertaintyPenalty);
}

function parseConfidence(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function createUserPrompt(query: string, results: SearchResult[]): string {
  const compactSources = results.slice(0, 10).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    domain: r.domain,
    publishedAt: r.publishedAt
  }));

  return JSON.stringify(
    {
      query,
      sources: compactSources
    },
    null,
    2
  );
}

export async function synthesize(query: string, results: SearchResult[], options: SynthOptions = {}): Promise<SynthResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthError("Missing OPENAI_API_KEY", 401, "MISSING_API_KEY");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const model = options.model ?? DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.2;
  const userPrompt = createUserPrompt(query, results);

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: options.signal,
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: options.maxOutputTokens ?? 350,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SynthError(body || `Synthesis request failed (${response.status})`, response.status, "HTTP_ERROR");
  }

  const payload = (await response.json()) as OpenAIChatResponse;
  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = parseModelJson(content);

  const answer = (typeof parsed.answer === "string" && parsed.answer.trim().length > 0
    ? parsed.answer
    : fallbackAnswer(query, results)
  ).trim();

  const parsedConfidence = parseConfidence(parsed.confidence);
  const confidence = clampConfidence(
    parsedConfidence ?? heuristicConfidence(query, results, answer)
  );

  const tokensIn =
    payload.usage?.prompt_tokens ?? estimateTokens(`${SYSTEM_PROMPT}\n${userPrompt}`);
  const tokensOut = payload.usage?.completion_tokens ?? estimateTokens(answer);

  return {
    answer,
    confidence,
    tokens: {
      in: tokensIn,
      out: tokensOut
    },
    model: payload.model ?? model
  };
}

export { clampConfidence, heuristicConfidence, estimateTokens };

export default {
  synthesize
};