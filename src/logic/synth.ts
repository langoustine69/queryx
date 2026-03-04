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
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export type SynthesisErrorCode =
  | "CONFIGURATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export class SynthesisError extends Error {
  readonly status: number;
  readonly code: SynthesisErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { status: number; code: SynthesisErrorCode; details?: unknown },
  ) {
    super(message);
    this.name = "SynthesisError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "You are a synthesis engine for downstream agents.",
  "Return strict JSON only with this schema:",
  '{"answer":"string","confidence":0..1}',
  "Rules:",
  "- concise, factual, no fluff",
  "- mention uncertainty briefly when evidence is weak",
  "- confidence must reflect source support and consistency",
].join("\n");

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function estimateTokenCount(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return Math.max(1, Math.ceil(cleaned.length / 4));
}

function buildSourceBlock(results: SearchResult[]): string {
  return results
    .slice(0, 10)
    .map((result, index) => {
      return [
        `[${index + 1}] ${normalizeText(result.title)}`,
        `URL: ${result.url}`,
        `Domain: ${result.domain}`,
        `Snippet: ${normalizeText(result.description || "")}`,
        result.publishedAt ? `Published: ${result.publishedAt}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function extractMessageContent(payload: unknown): string {
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }

  return "";
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

async function parseErrorDetails(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) return await response.json();
    const text = await response.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

export async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  options: SynthesisOptions = {},
): Promise<SynthesisResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthesisError("Missing OpenAI API key", {
      status: 500,
      code: "CONFIGURATION_ERROR",
    });
  }

  const endpoint = options.endpoint ?? process.env.OPENAI_CHAT_COMPLETIONS_ENDPOINT;
  if (!endpoint) {
    throw new SynthesisError("Missing OpenAI completions endpoint", {
      status: 500,
      code: "CONFIGURATION_ERROR",
    });
  }

  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const temperature = options.temperature ?? 0.2;

  const sourceBlock = buildSourceBlock(results);
  const userPrompt = [
    `Query: ${normalizeText(query)}`,
    "",
    "Sources:",
    sourceBlock || "(no sources)",
    "",
    "Return JSON only.",
  ].join("\n");

  const body = {
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await parseErrorDetails(response);

      if (response.status === 400) {
        throw new SynthesisError("Synthesis request rejected", {
          status: 400,
          code: "BAD_REQUEST",
          details,
        });
      }

      if (response.status === 401 || response.status === 403) {
        throw new SynthesisError("Synthesis unauthorized", {
          status: response.status,
          code: "UNAUTHORIZED",
          details,
        });
      }

      if (response.status === 429) {
        throw new SynthesisError("Synthesis rate limited", {
          status: 429,
          code: "RATE_LIMITED",
          details,
        });
      }

      throw new SynthesisError("Synthesis upstream error", {
        status: response.status,
        code: "UPSTREAM_ERROR",
        details,
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SynthesisError("Invalid JSON from synthesis model", {
        status: 502,
        code: "INVALID_RESPONSE",
      });
    }

    const rawContent = extractMessageContent(payload);
    const parsed = parseJsonObject(rawContent);

    const answerRaw =
      typeof parsed.answer === "string" && parsed.answer.trim()
        ? parsed.answer
        : "Insufficient evidence in retrieved sources.";

    const confidenceRaw =
      typeof parsed.confidence === "number"
        ? parsed.confidence
        : Number.parseFloat(String(parsed.confidence ?? "0"));

    const confidence = clamp01(confidenceRaw);

    const usage = payload as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const inTokens =
      typeof usage.usage?.prompt_tokens === "number"
        ? usage.usage.prompt_tokens
        : estimateTokenCount(`${SYSTEM_PROMPT}\n${userPrompt}`);

    const outTokens =
      typeof usage.usage?.completion_tokens === "number"
        ? usage.usage.completion_tokens
        : estimateTokenCount(answerRaw);

    return {
      answer: normalizeText(answerRaw),
      confidence,
      tokens: { in: Math.max(0, inTokens), out: Math.max(0, outTokens) },
      model: usage.model ?? model,
    };
  } catch (error) {
    if (error instanceof SynthesisError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new SynthesisError("Synthesis request timed out", {
        status: 504,
        code: "TIMEOUT",
      });
    }

    throw new SynthesisError("Synthesis network error", {
      status: 502,
      code: "NETWORK_ERROR",
      details: error,
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export type { SearchResult };