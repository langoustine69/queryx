/**
 * GET /v1/search — web search + AI synthesis
 */
import { Hono } from "hono";
import { SearchQuerySchema } from "../schemas";
import { search } from "../logic/search";

const app = new Hono();

app.get("/", async (c) => {
  const parsed = SearchQuerySchema.safeParse({
    q: c.req.query("q"),
    count: c.req.query("count"),
  });
  if (!parsed.success) {
    return c.json(
      { error: "Invalid query", code: "INVALID_QUERY", status: 400 },
      400
    );
  }
  const result = await search(parsed.data.q, { count: parsed.data.count });
  return c.json(result);
});

export default app;
