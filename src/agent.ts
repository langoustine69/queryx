import { createAgent } from "@lucid-agents/core";
import { http } from "@lucid-agents/http";
import { createAgentApp } from "@lucid-agents/hono";
import { payments, paymentsFromEnv } from "@lucid-agents/payments";
import "@lucid-agents/wallet";
import "@lucid-agents/identity";
import "@lucid-agents/a2a";
import "@lucid-agents/ap2";

function lucidNetwork(): `${string}:${string}` {
  const network = process.env.NETWORK;
  if (!network || network === "base") return "eip155:8453";
  if (network.includes(":")) return network as `${string}:${string}`;
  return `eip155:${network}`;
}

export async function createQueryxLucidAgent() {
  const agent = await createAgent({
    name: "queryx",
    version: "0.1.0",
    description: "Agent-native paid search API with x402 USDC payments.",
  })
    .use(http())
    .use(
      payments({
        config: paymentsFromEnv({
          payTo:
            (process.env.PAYMENTS_RECEIVABLE_ADDRESS as `0x${string}`) ??
            "0x0000000000000000000000000000000000000000",
          facilitatorUrl:
            process.env.FACILITATOR_URL ??
            "https://facilitator.daydreams.systems",
          network: lucidNetwork(),
          storage: { type: "in-memory" },
        }),
      }),
    )
    .build();

  return createAgentApp(agent);
}
