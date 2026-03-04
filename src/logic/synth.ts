import type { SearchResult } from "./types";

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

export interface SynthesizeOptions {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
  maxInputResults?: number;
}

export class SynthError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "SynthError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_MODEL = process.env.SYNTH_MODEL ?? "gpt-4o-mini";
const DEFAULT_ENDPOINT =
  process.env.OPENAI_API_ENDPOINT ?? "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = [
  "You are Queryx synthesis engine for downstream agents.",
  "Answer strictly from provided sources.",
  "Output strict JSON object only:",
  '{"answer":"string","confidence":number}',
  "Rules:",
  "- Keep answer concise and factual.",
  "- Include uncertainty when sources are weak.",
  "- confidence must be between 0 and 1.",
].join("\n");

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function estimateTokenCount(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return Math.max(1, Math.ceil(cleaned.length / 4));
}

function normalizeDomain(input: string): string {
  return input.replace(/^www\./i, "").toLowerCase();
}

function domainFromUrl(url: string): string {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return "";
  }
}

function isRecent(publishedAt?: string, withinDays = 30): boolean {
  if (!publishedAt) return false;
  const ms = Date.parse(publishedAt);
  if (Number.isNaN(ms)) return false;
  const ageMs = Date.now() - ms;
  return ageMs >= 0 && ageMs <= withinDays * 24 * 60 * 60 * 1000;
}

export function computeHeuristicConfidence(results: SearchResult[]): number {
  if (results.length === 0) return 0.12;

  const capped = results.slice(0, 8);
  const coverage = Math.min(1, capped.length / 6);

  const domains = new Set<string>();
  let recentCount = 0;
  for (const r of capped) {
    domains.add(normalizeDomain(r.domain || domainFromUrl(r.url)));
    if (isRecent(r.publishedAt, 30)) recentCount += 1;
  }

  const diversity = Math.min(1, domains.size / Math.max(1, Math.min(capped.length, 4)));
  const recency = recentCount / capped.length;

  return clampConfidence(0.1 + coverage * 0.45 + diversity * 0.25 + recency * 0.2);
}

function buildUserPayload(query: string, results: SearchResult[]): string {
  const compact = results.map((r, index) => ({
    id: index + 1,
    title: r.title,
    url: r.url,
    domain: r.domain,
    publishedAt: r.publishedAt ?? null,
    snippet: r.description,
  }));

  return JSON.stringify(
    {
      query,
      sources: compact,
      expected_schema: {
        answer: "string",
        confidence: "number 0..1",
      },
    },
    null,
    2,
  );
}

function extractMessageContent(payload: any): string {
  const messageContent = payload?.choices?.[0]?.message?.content;
  if (typeof messageContent === "string") return messageContent;

  if (Array.isArray(messageContent)) {
    const parts = messageContent
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");
  }

  if (typeof payload?.output_text === "string") return payload.output_text;

  return "";
}

function parseAssistantJson(content: string): { answer?: string; confidence?: number } | undefined {
  const stripped = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return undefined;

  const jsonSegment = stripped.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonSegment) as { answer?: string; confidence?: number };
    return parsed;
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesize(
  query: string,
  results: SearchResult[],
  options: SynthesizeOptions = {},
): Promise<SynthesisResult> {
  const trimmedQuery = query.trim();
  const limitedResults = results.slice(0, options.maxInputResults ?? 8);

  const heuristicConfidence = computeHeuristicConfidence(limitedResults);
  if (!trimmedQuery || limitedResults.length === 0) {
    const answer = "Insufficient evidence in current sources to provide a confident answer.";
    return {
      answer,
      confidence: clampConfidence(heuristicConfidence * 0.8),
      tokens: {
        in: estimateTokenCount(trimmedQuery),
        out: estimateTokenCount(answer),
      },
      model: options.model ?? DEFAULT_MODEL,
    };
  }

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SynthError("Missing synthesis API key", 401, "MISSING_API_KEY");
  }

  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const model = options.model ?? DEFAULT_MODEL;
  const timeoutMs = Math.max(1000, options.timeoutMs ?? 20_000);

  const userPayload = buildUserPayload(trimmedQuery, limitedResults);

  let response: Response;
  try {
    response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
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
            { role: "user", content: userPayload },
          ],
        }),
      },
      timeoutMs,
    );
  } catch (error) {
    throw new SynthError(
      error instanceof Error ? error.message : "Synthesis request failed",
      0,
      "NETWORK_ERROR",
      error,
    );
  }

  const rawText = await response.text();
  let payload: any;
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Synthesis API error (${response.status})`;
    throw new SynthError(message, response.status, "UPSTREAM_ERROR", payload);
  }

  const rawContent = extractMessageContent(payload);
  const parsed = parseAssistantJson(rawContent);

  const answer = (parsed?.answer || rawContent || "").trim() || "No answer produced.";
  const modelConfidence =
    typeof parsed?.confidence === "number" ? clampConfidence(parsed.confidence) : undefined;

  const confidence =
    modelConfidence === undefined
      ? heuristicConfidence
      : clampConfidence(modelConfidence * 0.7 + heuristicConfidence * 0.3);

  const inputTextForEstimate = `${SYSTEM_PROMPT}\n${userPayload}`;
  const inTokens = Number(payload?.usage?.prompt_tokens) || estimateTokenCount(inputTextForEstimate);
  const outTokens = Number(payload?.usage?.completion_tokens) || estimateTokenCount(answer);

  return {
    answer,
    confidence: clampConfidence(confidence),
    tokens: {
      in: Math.max(0, inTokens),
      out: Math.max(0, outTokens),
    },
    model: typeof payload?.model === "string" ? payload.model : model,
  };
}

export type { SearchResult };
export default synthesize;