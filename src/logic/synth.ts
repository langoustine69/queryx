import type { SearchResult } from "./brave";

export interface SynthesisTokens {
  in: number;
  out: number;
}

export interface SynthesisResult {
  answer: string;
  confidence: number;
  tokens: SynthesisTokens;
  model: string;
}

export interface SynthesisOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export class SynthesisError extends Error {
  public readonly status?: number;
  public readonly details?: string;

  constructor(message: string, status?: number, details?: string) {
    super(message);
    this.name = "SynthesisError";
    this.status = status;
    this.details = details;
  }
}

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are a synthesis engine for downstream agents. Return only JSON with shape " +
  '{"answer":"string","confidence":0..1}. ' +
  "Use concise factual prose, include caveats only when required, and avoid markdown.";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function estimateTokens(text: string): number {
  const normalized = text.trim();
  if (normalized === "") {
    return 0;
  }
  return Math.max(1, Math.ceil(normalized.length / 4));
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildSourcesPayload(results: SearchResult[]): Array<Record<string, string>> {
  return results.slice(0, 10).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    source: item.source,
    publishedDate: item.publishedDate ?? "",
  }));
}

function buildUserPrompt(query: string, results: SearchResult[]): string {
  const payload = {
    query,
    sources: buildSourcesPayload(results),
    instructions: [
      "Synthesize only from provided sources.",
      "If evidence is weak, lower confidence.",
      "Avoid hedging unless uncertainty is material.",
    ],
  };

  return JSON.stringify(payload);
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fencedMatch?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start < 0 || end <= start) {
    return null;
  }

  const jsonCandidate = candidate.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonCandidate);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function getAssistantText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as { message?: { content?: unknown } };
    const content = first?.message?.content;

    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      const parts = content
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }
          if (part && typeof part === "object" && "text" in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
          }
          return "";
        })
        .filter(Boolean);

      return parts.join("\n").trim();
    }
  }

  return "";
}

function parseAnswerAndConfidence(rawContent: string): { answer: string; confidence?: number } {
  const json = extractJsonObject(rawContent);
  if (!json) {
    return { answer: rawContent.trim() };
  }

  const answer =
    typeof json.answer === "string"
      ? json.answer.trim()
      : typeof json.final_answer === "string"
        ? json.final_answer.trim()
        : rawContent.trim();

  const confidence = numberOrUndefined(json.confidence);
  return { answer, confidence };
}

function heuristicConfidence(query: string, results: SearchResult[], answer: string): number {
  let score = 0.3;
  score += Math.min(results.length, 8) * 0.07;

  if (query.trim().length > 20) {
    score += 0.05;
  }

  if (answer.trim().length >= 80) {
    score += 0.08;
  }

  if (results.length <= 1) {
    score -= 0.12;
  }

  return clamp01(score);
}

function extractUsageTokens(payload: Record<string, unknown>): { in?: number; out?: number } {
  const usage = payload.usage as Record<string, unknown> | undefined;
  if (!usage) {
    return {};
  }

  const inTokens = numberOrUndefined(usage.prompt_tokens) ?? numberOrUndefined(usage.input_tokens);
  const outTokens = numberOrUndefined(usage.completion_tokens) ?? numberOrUndefined(usage.output_tokens);

  return {
    in: inTokens,
    out: outTokens,
  };
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text();
    return text.trim() === "" ? undefined : text;
  } catch {
    return undefined;
  }
}

export async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  options: SynthesisOptions = {},
): Promise<SynthesisResult> {
  const endpoint = process.env.OPENAI_API_URL;
  if (!endpoint) {
    throw new SynthesisError("OPENAI_API_URL is not configured.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthesisError("OPENAI_API_KEY is not configured.");
  }

  const model = options.model ?? DEFAULT_MODEL;
  const userPrompt = buildUserPrompt(query, results);

  const requestBody = {
    model,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxOutputTokens ?? 350,
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
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    throw new SynthesisError(`Synthesis request failed: ${message}`);
  }

  if (!response.ok) {
    const details = await safeReadText(response);
    throw new SynthesisError(`Synthesis API request failed with status ${response.status}.`, response.status, details);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new SynthesisError("Synthesis API returned invalid JSON.", response.status);
  }

  const rawContent = getAssistantText(payload).trim();
  const parsed = parseAnswerAndConfidence(rawContent);

  const answer = parsed.answer || "No answer generated.";
  const confidence = clamp01(parsed.confidence ?? heuristicConfidence(query, results, answer));

  const usage = extractUsageTokens(payload);
  const tokenIn = usage.in ?? estimateTokens(SYSTEM_PROMPT + userPrompt);
  const tokenOut = usage.out ?? estimateTokens(answer);

  return {
    answer,
    confidence,
    tokens: {
      in: tokenIn,
      out: tokenOut,
    },
    model: typeof payload.model === "string" ? payload.model : model,
  };
}

export const synthesize = synthesizeAnswer;
export default synthesizeAnswer;