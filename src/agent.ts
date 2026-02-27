/**
 * Queryx Lucid Agent — x402 paid API with TDD.
 * Core agent setup with extensions and entrypoints.
 */
import { createAgent } from "@lucid-agents/core";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";
import { z } from "zod";
import {
  SearchQuerySchema,
  DeepSearchBodySchema,
  SearchResponseSchema,
} from "./schemas";

const NETWORK = process.env.NETWORK || "base";

const paymentsConfig = paymentsFromEnv({
  network: NETWORK,
});

const paymentsExt = payments({ config: paymentsConfig });

export const runtime = await createAgent({
  name: "queryx",
  url: `http://localhost:${process.env.PORT || 3000}`,
  version: "0.1.0",
  description:
    "AI-powered web search agent accepting x402 USDC micropayments on Base.",
  capabilities: {
    streaming: false,
    pushNotifications: false,
  },
})
  .use(paymentsExt)
  .addEntrypoint({
    key: "search",
    title: "Web Search",
    description: "Web search + AI synthesis",
    input: SearchQuerySchema,
    output: SearchResponseSchema,
    invoke: { price: { amount: "0.001", currency: "USDC" } },
  })
  .addEntrypoint({
    key: "search-news",
    title: "News Search",
    description: "News-focused search + AI synthesis",
    input: SearchQuerySchema,
    output: SearchResponseSchema,
    invoke: { price: { amount: "0.001", currency: "USDC" } },
  })
  .addEntrypoint({
    key: "search-deep",
    title: "Deep Research",
    description: "Multi-source deep research + AI synthesis",
    input: DeepSearchBodySchema,
    output: SearchResponseSchema,
    invoke: { price: { amount: "0.005", currency: "USDC" } },
  })
  .build();
