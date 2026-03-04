import type { SearchResult } from "./brave";

export interface SynthTokens {
  in: number;
  out: number;
}

export interface SynthesisResult {
  answer: string;
  confidence: number;
  tokens: SynthTokens;
  model: string;
}

export interface SynthOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface OpenAIChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

interface OpenAIChatResponse {
  model?: string;
  usage?: OpenAIUsage;
  choices?: OpenAIChoice[];
  error?: {
    message?: string;
  };
}

export class SynthesisError extends Error {
  public readonly code: string;
  public readonly status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "SynthesisError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT =
  "You are Queryx synthesis engine. Return strict JSON only with keys: answer (string), confidence (number 0..1). " +
  "Answer must be concise for machine consumers, grounded in provided sources, and avoid speculation.";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function estimateTokens(input: string): number {
  return Math.max(1, Math.ceil(input.length / 4));
}

function getChoiceContent(choice: OpenAIChoice | undefined): string {
  const content = choice?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  return "";
}

function safeJsonParse<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function heuristicConfidence(results: SearchResult[], answer: string): number {
  const sourceFactor = Math.min(results.length, 8) / 8;
  const answerFactor = Math.min(answer.length, 280) / 280;
  const uncertaintyPenalty = /\b(maybe|unclear|not enough information|insufficient)\b/i.test(answer) ? 0.2 : 0;
  return clamp01(0.2 + sourceFactor * 0.6 + answerFactor * 0.2 - uncertaintyPenalty);
}

function buildUserPrompt(query: string, results: SearchResult[]): string {
  const compactSources = results.slice(0, 8).map((r, index) => ({
    id: index + 1,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    publishedAt: r.publishedAt ?? null,
    domain: r.sourceDomain,
  }));

  return JSON.stringify({
    query,
    sources: compactSources,
    instructions: [
      "Synthesize a direct answer.",
      "If evidence is weak, explicitly say what is missing.",
      "Keep answer concise and factual.",
      "Output strict JSON only.",
    ],
  });
}

export async function synthesize(
  query: string,
  results: SearchResult[],
  options: SynthOptions = {},
): Promise<SynthesisResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthesisError("Missing OPENAI_API_KEY.", "missing_api_key");
  }

  const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const endpoint = process.env.OPENAI_BASE_URL ?? OPENAI_CHAT_COMPLETIONS_URL;
  const timeoutMs = options.timeoutMs ?? 15_000;

  const userPrompt = buildUserPrompt(query, results);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  let externalAbortHandler: (() => void) | undefined;
  if (options.signal) {
    externalAbortHandler = () => controller.abort(options.signal?.reason ?? "aborted");
    if (options.signal.aborted) {
      externalAbortHandler();
    } else {
      options.signal.addEventListener("abort", externalAbortHandler, { once: true });
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 350,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      let message = "Synthesis upstream request failed.";
      try {
        const body = (await response.json()) as OpenAIChatResponse;
        if (body.error?.message) {
          message = body.error.message;
        }
      } catch {
        // ignore parse errors
      }

      const code = response.status === 429 ? "rate_limited" : "upstream_error";
      throw new SynthesisError(message, code, response.status);
    }

    const data = (await response.json()) as OpenAIChatResponse;
    const rawContent = getChoiceContent(data.choices?.[0]);

    const parsed = safeJsonParse<{ answer?: string; confidence?: number }>(rawContent);
    const answer = (parsed?.answer ?? rawContent).trim();
    const confidence = clamp01(
      typeof parsed?.confidence === "number" ? parsed.confidence : heuristicConfidence(results, answer),
    );

    const promptTokens = data.usage?.prompt_tokens ?? estimateTokens(`${SYSTEM_PROMPT}\n${userPrompt}`);
    const completionTokens = data.usage?.completion_tokens ?? estimateTokens(answer);

    return {
      answer,
      confidence,
      tokens: {
        in: promptTokens,
        out: completionTokens,
      },
      model: data.model ?? model,
    };
  } catch (error) {
    if (error instanceof SynthesisError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new SynthesisError("Synthesis request timed out.", "timeout");
    }

    throw new SynthesisError(
      error instanceof Error ? error.message : "Unknown synthesis network error.",
      "network_error",
    );
  } finally {
    clearTimeout(timeout);
    if (options.signal && externalAbortHandler) {
      options.signal.removeEventListener("abort", externalAbortHandler);
    }
  }
}