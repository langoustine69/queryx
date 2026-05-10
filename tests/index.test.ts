import { describe, expect, test } from "bun:test";
import { handleRequest } from "../src/index";

describe("HTTP server", () => {
  test("GET /health returns ok", async () => {
    const response = await handleRequest(new Request("http://localhost/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("GET /v1/search without payment returns x402 challenge", async () => {
    const response = await handleRequest(new Request("http://localhost/v1/search?q=test"));
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(response.headers.get("x402-version")).toBe("1");
    expect(response.headers.get("x402-price")).toBe("0.001");
    expect(body.error).toBe("payment_required");
  });

  test("GET /v1/search requires a non-empty query after payment", async () => {
    const response = await handleRequest(
      new Request("http://localhost/v1/search", {
        headers: { "payment-signature": "test-signature" },
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("missing_query");
  });
});
