/**
 * Queryx server entrypoint.
 * Uses Lucid Agents Hono adapter with x402 payment middleware.
 */
import { createAgentApp } from "@lucid-agents/hono";
import { Hono } from "hono";
import { runtime } from "./agent";
import searchRoute from "./routes/search";
import searchNewsRoute from "./routes/search-news";
import searchDeepRoute from "./routes/search-deep";

const startTime = Date.now();

const { app } = await createAgentApp(runtime, {
  afterMount(honoApp: Hono) {
    // Mount custom routes after agent routes
    honoApp.route("/v1/search/news", searchNewsRoute);
    honoApp.route("/v1/search/deep", searchDeepRoute);
    honoApp.route("/v1/search", searchRoute);

    // Health endpoint (free, no payment required)
    honoApp.get("/health", (c) =>
      c.json({
        status: "ok" as const,
        version: "0.1.0",
        uptime: Math.floor((Date.now() - startTime) / 1000),
      })
    );
  },
});

const port = Number(process.env.PORT || 3000);

export default {
  port,
  fetch: app.fetch,
};
