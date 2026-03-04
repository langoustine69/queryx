import type { SearchResult, SynthesisResult } from "./types";

export interface SynthOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export class SynthError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status = 500, body?: string) {
    super(message);
    this.name = "SynthError";
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_SYSTEM_PROMPT =
  "You are Queryx synthesis engine for downstream agents. Respond with strict JSON only: " +
  '{"answer":"string","confidence":0.0}. ' +
  "Rules: concise answer, no markdown, no preamble, ground claims in provided sources, " +
  "state uncertainty when evidence is weak.";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(value, 0, 1);
}

export function estimateTokens(text: string): number {
  const length = text.trim().length;
  if (length === 0) return 1;
  return Math.max(1, Math.ceil(length / 4));
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

function parseModelJSON(content: string): { answer?: string; confidence?: number } {
  const cleaned = stripCodeFences(content).trim();
  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

function extractMessageContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        return "";
      })
      .join("\n");
  }
  return "";
}

function fallbackAnswer(results: SearchResult[]): string {
  if (results.length === 0) {
    return "Insufficient evidence to answer confidently from current search results.";
  }

  const summary = results
    .slice(0, 3)
    .map((r) => (r.snippet?.trim().length ? r.snippet.trim() : r.title.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return summary.length > 0
    ? summary.slice(0, 500)
    : "Relevant sources were found, but they do not contain enough detail for a confident answer.";
}

export function scoreConfidence(query: string, results: SearchResult[], answer: string): number {
  let score = 0.1;

  const uniqueDomains = new Set(results.map((r) => r.domain)).size;
  score += Math.min(0.35, results.length * 0.08);
  score += Math.min(0.2, uniqueDomains * 0.06);

  if (answer.trim().length >= 80) score += 0.15;

  const hasRecentSource = results.some((r) => {
    if (!r.publishedAt) return false;
    const ts = Date.parse(r.publishedAt);
    if (Number.isNaN(ts)) return false;
    const daysOld = (Date.now() - ts) / 86_400_000;
    return daysOld <= 30;
  });
  if (hasRecentSource) score += 0.1;

  if (query.trim().length > 0 && answer.toLowerCase().includes(query.trim().split(/\s+/)[0].toLowerCase())) {
    score += 0.05;
  }

  return clampConfidence(score);
}

function buildUserPrompt(query: string, results: SearchResult[]): string {
  const compactResults = results.slice(0, 8).map((r, index) => ({
    index: index + 1,
    title: r.title,
    url: r.url,
    domain: r.domain,
    snippet: r.snippet,
    publishedAt: r.publishedAt ?? null,
  }));

  return JSON.stringify(
    {
      query,
      results: compactResults,
      instructions: "Return only JSON: {answer: string, confidence: number between 0 and 1}",
    },
    null,
    2,
  );
}

async function readResponseTextSafe(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  options: SynthOptions = {},
): Promise<SynthesisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthError("Missing OPENAI_API_KEY", 500);
  }

  const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const endpoint = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions";
  const systemPrompt = process.env.SYNTH_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;
  const userPrompt = buildUserPrompt(query, results);

  const requestBody = {
    model,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 320,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });
  } catch (error) {
    throw new SynthError(`Synthesis request failed: ${(error as Error)?.message ?? "Unknown error"}`, 500);
  }

  if (!response.ok) {
    const body = await readResponseTextSafe(response);
    throw new SynthError(`Synthesis API failed with status ${response.status}`, response.status, body);
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new SynthError("Invalid JSON from synthesis API", response.status);
  }

  const content = extractMessageContent(payload);
  const parsed = parseModelJSON(content);

  const answer = typeof parsed.answer === "string" && parsed.answer.trim().length > 0 ? parsed.answer.trim() : fallbackAnswer(results);

  const confidence =
    typeof parsed.confidence === "number"
      ? clampConfidence(parsed.confidence)
      : scoreConfidence(query, results, answer);

  const promptTokens =
    typeof payload?.usage?.prompt_tokens === "number"
      ? payload.usage.prompt_tokens
      : estimateTokens(systemPrompt) + estimateTokens(userPrompt);

  const completionTokens =
    typeof payload?.usage?.completion_tokens === "number"
      ? payload.usage.completion_tokens
      : estimateTokens(content || answer);

  return {
    answer,
    confidence,
    tokens: {
      in: promptTokens,
      out: completionTokens,
    },
    model: typeof payload?.model === "string" && payload.model.length > 0 ? payload.model : model,
  };
}

export const synthesize = synthesizeAnswer;
export const synth = synthesizeAnswer;
export default synthesizeAnswer;