import { Hono } from "hono";
import { createSearchRoutes } from "./routes/search";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/", createSearchRoutes());

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};
