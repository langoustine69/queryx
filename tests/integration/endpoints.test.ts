/**
 * Integration tests — endpoint responses, error handling.
 * Tests route handling without the payment middleware (unit-level integration).
 */
import { describe, test, expect } from "bun:test";
import searchRoute from "../../src/routes/search";
import searchNewsRoute from "../../src/routes/search-news";
import searchDeepRoute from "../../src/routes/search-deep";

describe("GET /v1/search", () => {
  test("returns 400 for missing query", async () => {
    const req = new Request("http://localhost/");
    const res = await searchRoute.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_QUERY");
  });
});

describe("GET /v1/search/news", () => {
  test("returns 400 for missing query", async () => {
    const req = new Request("http://localhost/");
    const res = await searchNewsRoute.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_QUERY");
  });
});

describe("POST /v1/search/deep", () => {
  test("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await searchDeepRoute.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_BODY");
  });

  test("returns 400 for missing query field", async () => {
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sources: 3 }),
    });
    const res = await searchDeepRoute.fetch(req);
    expect(res.status).toBe(400);
  });
});
