/**
 * POST /v1/search/deep — multi-source deep research
 */
import { Hono } from "hono";
import { DeepSearchBodySchema } from "../schemas";
import { search } from "../logic/search";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(
      { error: "Invalid JSON body", code: "INVALID_BODY", status: 400 },
      400
    );
  }
  const parsed = DeepSearchBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", code: "INVALID_BODY", status: 400 },
      400
    );
  }
  const result = await search(parsed.data.query, {
    deep: true,
    count: parsed.data.sources,
  });
  return c.json(result);
});

export default app;
