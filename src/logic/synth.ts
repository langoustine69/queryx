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
  model?: string;
  endpoint?: string;
  signal?: AbortSignal;
  temperature?: number;
  fetchImpl?: typeof fetch;
}

export const SYNTH_SYSTEM_PROMPT =
  "You are a search synthesis engine for agents. Respond with strict JSON only: " +
  '{"answer":"string","confidence":number}. ' +
  "Rules: concise answer, no markdown, mention uncertainty when evidence is weak, " +
  "ground claims in provided sources only, and keep confidence between 0 and 1.";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function estimateTokens(text: string): number {
  const chars = text.length;
  return Math.max(1, Math.ceil(chars / 4));
}

function extractMessageContent(content: unknown): string {
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

function parseStructuredOutput(content: string): { answer: string; confidence?: number } {
  const trimmed = content.trim();
  if (!trimmed) return { answer: "" };

  try {
    const parsed = JSON.parse(trimmed) as { answer?: unknown; confidence?: unknown };
    const answer =
      typeof parsed.answer === "string" ? parsed.answer.trim() : trimmed;
    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : undefined;
    return { answer, confidence };
  } catch {
    return { answer: trimmed };
  }
}

function heuristicConfidence(results: SearchResult[], answer: string): number {
  let score = 0.2;
  score += Math.min(results.length, 8) * 0.08;
  if (answer.length > 80) score += 0.1;
  if (/not enough|uncertain|unclear|insufficient/i.test(answer)) score -= 0.15;
  return clamp01(score);
}

function getApiKey(options: SynthesisOptions): string {
  return options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
}

export async function synthesizeAnswer(
  query: string,
  results: SearchResult[],
  options: SynthesisOptions = {}
): Promise<SynthesisResult> {
  const model = options.model ?? process.env.SYNTH_MODEL ?? "gpt-4o-mini";
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      answer: "",
      confidence: 0,
      tokens: { in: 0, out: 0 },
      model,
    };
  }

  const apiKey = getApiKey(options);
  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Set OPENAI_API_KEY.");
  }

  const endpoint =
    options.endpoint ??
    process.env.OPENAI_CHAT_COMPLETIONS_ENDPOINT ??
    "https://api.openai.com/v1/chat/completions";

  const sourcePayload = results.slice(0, 8).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    domain: r.domain,
    publishedAt: r.publishedAt,
  }));

  const userPayload = JSON.stringify({
    query: trimmedQuery,
    sources: sourcePayload,
  });

  const requestBody = {
    model,
    temperature: options.temperature ?? 0.2,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: SYNTH_SYSTEM_PROMPT },
      { role: "user" as const, content: userPayload },
    ],
  };

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: options.signal,
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => undefined);
    }
    throw new Error(
      `Synthesis request failed (${response.status}): ${JSON.stringify(details)}`
    );
  }

  const payload = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  const rawContent = extractMessageContent(
    payload.choices?.[0]?.message?.content
  );
  const parsed = parseStructuredOutput(rawContent);

  const answer = parsed.answer || "No synthesis available.";
  const confidence = clamp01(
    typeof parsed.confidence === "number"
      ? parsed.confidence
      : heuristicConfidence(results, answer)
  );

  const estimatedPrompt = estimateTokens(SYNTH_SYSTEM_PROMPT + userPayload);
  const estimatedCompletion = estimateTokens(answer);

  const tokensIn =
    payload.usage?.prompt_tokens ??
    payload.usage?.input_tokens ??
    estimatedPrompt;
  const tokensOut =
    payload.usage?.completion_tokens ??
    payload.usage?.output_tokens ??
    estimatedCompletion;

  return {
    answer,
    confidence,
    tokens: {
      in: Math.max(0, Number(tokensIn) || 0),
      out: Math.max(0, Number(tokensOut) || 0),
    },
    model: payload.model ?? model,
  };
}

export default synthesizeAnswer;