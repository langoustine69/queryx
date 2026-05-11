import { describe, expect, test } from "bun:test";
import server from "../../src";

describe("Queryx HTTP app", () => {
  test("GET /health is free and returns ok", async () => {
    const response = await server.fetch(new Request("http://queryx.test/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("GET /v1/search returns 402 without payment", async () => {
    const response = await server.fetch(
      new Request("http://queryx.test/v1/search?q=bitcoin"),
    );
    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.error.code).toBe("PAYMENT_REQUIRED");
  });

  test("GET /v1/search returns a contract-valid response with test payment", async () => {
    const response = await server.fetch(
      new Request("http://queryx.test/v1/search?q=bitcoin", {
        headers: { "x402-test-payment": "valid" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.query).toBe("bitcoin");
    expect(body.freshness.fetchedAt).toBeString();
    expect(body.confidence).toBeGreaterThanOrEqual(0);
  });

  test("POST /v1/search/deep validates request body", async () => {
    const response = await server.fetch(
      new Request("http://queryx.test/v1/search/deep", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x402-test-payment": "valid",
        },
        body: JSON.stringify({ query: "" }),
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });
});
