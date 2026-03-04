import { SearchResult } from "./types";

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
  signal?: AbortSignal;
  apiKey?: string;
  baseUrl?: string;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const SYSTEM_PROMPT = [
  "You are Queryx synthesis for agent consumers.",
  "Return STRICT JSON only with shape:",
  '{"answer":"string","confidence":0.0}',
  "Keep the answer concise, factual, and directly useful for downstream automation.",
  "Confidence must be a number between 0 and 1 based on evidence quality and source agreement.",
].join(" ");

export class SynthError extends Error {
  status?: number;
  cause?: unknown;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = "SynthError";
    this.status = status;
    this.cause = cause;
  }
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function computeConfidence(query: string, results: SearchResult[], answer: string): number {
  const evidenceDepth = Math.min(results.length / 8, 1);
  const sourceDiversity = Math.min(new Set(results.map((r) => r.domain)).size / 5, 1);
  const answerLength = Math.min(answer.trim().split(/\s+/).filter(Boolean).length / 80, 1);

  const uncertaintyPenalty =
    /unclear|unknown|insufficient|not enough|cannot determine/i.test(answer) ? 0.2 : 0;

  const score = 0.5 * evidenceDepth + 0.3 * sourceDiversity + 0.2 * answerLength - uncertaintyPenalty;
  void query;
  return clampConfidence(score);
}

function estimateTokens(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return Math.max(1, Math.ceil(cleaned.length / 4));
}

function buildUserPrompt(query: string, results: SearchResult[]): string {
  const compact = results.slice(0, 8).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    domain: r.domain,
    publishedAt: r.publishedAt,
  }));

  return JSON.stringify({
    query,
    results: compact,
    instruction: "Synthesize an answer for agents. No markdown. JSON only.",
  });
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct === "object") return direct as Record<string, unknown>;
    return null;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      return null;
    } catch {
      return null;
    }
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `Synthesis API error (${res.status})`;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? text;
  } catch {
    return text;
  }
}

export async function synthesize(query: string, results: SearchResult[], options: SynthOptions = {}): Promise<SynthResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      answer: "",
      confidence: 0,
      tokens: { in: 0, out: 0 },
      model: options.model ?? process.env.SYNTH_MODEL ?? "gpt-4o-mini",
    };
  }

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthError("Missing OPENAI_API_KEY");
  }

  const model = options.model ?? process.env.SYNTH_MODEL ?? "gpt-4o-mini";
  const baseUrl = (options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const userPrompt = buildUserPrompt(normalizedQuery, results);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (error) {
    throw new SynthError("Network error while calling synthesis model", undefined, error);
  }

  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new SynthError(message, res.status);
  }

  let payload: ChatCompletionResponse;
  try {
    payload = (await res.json()) as ChatCompletionResponse;
  } catch (error) {
    throw new SynthError("Invalid JSON from synthesis model", res.status, error);
  }

  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
  const parsed = parseJsonObject(content);

  const answer =
    typeof parsed?.answer === "string"
      ? parsed.answer.trim()
      : content;

  const parsedConfidence =
    typeof parsed?.confidence === "number" ? parsed.confidence : undefined;

  const confidence = clampConfidence(
    parsedConfidence ?? computeConfidence(normalizedQuery, results, answer),
  );

  const inTokens = payload.usage?.prompt_tokens ?? estimateTokens(`${SYSTEM_PROMPT}\n${userPrompt}`);
  const outTokens = payload.usage?.completion_tokens ?? estimateTokens(answer);

  return {
    answer,
    confidence,
    tokens: {
      in: Math.max(0, Math.round(inTokens)),
      out: Math.max(0, Math.round(outTokens)),
    },
    model: payload.model ?? model,
  };
}

export const synth = synthesize;
export default synthesize;