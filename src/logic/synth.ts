import type { SearchResult } from "./brave";

export interface SynthTokens {
  in: number;
  out: number;
}

export interface SynthResponse {
  answer: string;
  confidence: number;
  tokens: SynthTokens;
  model: string;
}

export interface SynthOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export class SynthAPIError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "SynthAPIError";
    this.status = status;
    this.details = details;
  }
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = [
  "You are Queryx synthesis engine.",
  "Return strictly valid JSON only.",
  'Schema: {"answer": string, "confidence": number}',
  "Rules:",
  "- concise answer, 2-6 sentences",
  "- no markdown",
  "- confidence in [0,1]",
  "- if sources conflict, acknowledge uncertainty briefly",
].join("\n");

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 4);
}

function extractMessageContent(raw: unknown): string {
  if (typeof raw === "string") return raw;

  if (Array.isArray(raw)) {
    const parts: string[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const text = item.text;
      if (typeof text === "string") parts.push(text);
    }
    return parts.join("\n").trim();
  }

  return "";
}

function tryParseJsonObject(raw: string): JsonRecord | undefined {
  const text = raw.trim();
  if (!text) return undefined;

  try {
    const parsed = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return undefined;
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
}

function parseUsageTokens(payload: unknown): SynthTokens | undefined {
  if (!isRecord(payload)) return undefined;
  const usage = payload.usage;
  if (!isRecord(usage)) return undefined;

  const promptTokens =
    typeof usage.prompt_tokens === "number"
      ? usage.prompt_tokens
      : Number(usage.prompt_tokens);
  const completionTokens =
    typeof usage.completion_tokens === "number"
      ? usage.completion_tokens
      : Number(usage.completion_tokens);

  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) {
    return undefined;
  }

  return {
    in: Math.max(0, Math.round(promptTokens)),
    out: Math.max(0, Math.round(completionTokens)),
  };
}

export function computeConfidence(
  _query: string,
  results: SearchResult[],
  answer: string,
): number {
  if (results.length === 0) return 0.1;

  const uniqueDomains = new Set(
    results.map((r) => r.sourceDomain).filter(Boolean),
  ).size;

  let confidence = 0.25;
  confidence += Math.min(results.length, 8) * 0.06;
  confidence += Math.min(uniqueDomains, 5) * 0.035;

  const hasRecentSource = results.some((r) => {
    if (!r.publishedAt) return false;
    const t = new Date(r.publishedAt).getTime();
    if (Number.isNaN(t)) return false;
    const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
    return ageDays >= 0 && ageDays <= 30;
  });

  if (hasRecentSource) confidence += 0.08;
  if (answer.trim().length < 80) confidence -= 0.05;

  return clampConfidence(confidence);
}

function buildSourcePayload(results: SearchResult[]): unknown[] {
  return results.slice(0, 12).map((r) => ({
    title: r.title,
    url: r.url,
    domain: r.sourceDomain,
    description: r.description,
    publishedAt: r.publishedAt,
  }));
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return undefined;
  }
}

export async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  options: SynthOptions = {},
): Promise<SynthResponse> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      answer: "",
      confidence: 0,
      tokens: { in: 0, out: 0 },
      model: options.model ?? DEFAULT_MODEL,
    };
  }

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthAPIError("Missing OPENAI_API_KEY", 0);
  }

  const endpoint = options.endpoint ?? process.env.OPENAI_CHAT_COMPLETIONS_URL;
  if (!endpoint) {
    throw new SynthAPIError("Missing OPENAI_CHAT_COMPLETIONS_URL", 0);
  }

  const model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const requestBody = {
    model,
    temperature: options.temperature ?? 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          query: normalizedQuery,
          sources: buildSourcePayload(results),
        }),
      },
    ],
  };

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      signal: options.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    throw new SynthAPIError("Failed to reach synthesis model endpoint", 0, error);
  }

  if (!response.ok) {
    throw new SynthAPIError(
      `Synthesis request failed with status ${response.status}`,
      response.status,
      await parseErrorBody(response),
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new SynthAPIError("Synthesis endpoint returned invalid JSON", 0, error);
  }

  const modelName =
    isRecord(payload) && typeof payload.model === "string" ? payload.model : model;

  const rawContent = (() => {
    if (!isRecord(payload)) return "";
    const choices = payload.choices;
    if (!Array.isArray(choices) || choices.length === 0) return "";
    const first = choices[0];
    if (!isRecord(first)) return "";
    const message = first.message;
    if (!isRecord(message)) return "";
    return extractMessageContent(message.content);
  })();

  const parsed = tryParseJsonObject(rawContent);
  const answer =
    parsed && typeof parsed.answer === "string" && parsed.answer.trim().length > 0
      ? parsed.answer.trim()
      : rawContent.trim() || "No synthesis available.";

  const modelConfidenceRaw = parsed?.confidence;
  const modelConfidence =
    typeof modelConfidenceRaw === "number"
      ? modelConfidenceRaw
      : Number(modelConfidenceRaw);

  const confidence = Number.isFinite(modelConfidence)
    ? clampConfidence(modelConfidence)
    : computeConfidence(normalizedQuery, results, answer);

  const usageTokens = parseUsageTokens(payload);
  const tokens =
    usageTokens ??
    ({
      in: estimateTokenCount(JSON.stringify(requestBody)),
      out: estimateTokenCount(answer),
    } satisfies SynthTokens);

  return {
    answer,
    confidence,
    tokens,
    model: modelName,
  };
}

export default synthesizeAnswer;