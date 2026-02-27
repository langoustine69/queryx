/**
 * Logic tests — query normalization, search coordination.
 */
import { describe, test, expect } from "bun:test";
import { normalizeQuery } from "../../src/logic/search";

describe("normalizeQuery", () => {
  test("trims whitespace", () => {
    expect(normalizeQuery("  hello  ")).toBe("hello");
  });

  test("lowercases", () => {
    expect(normalizeQuery("Hello World")).toBe("hello world");
  });

  test("collapses multiple spaces", () => {
    expect(normalizeQuery("hello    world")).toBe("hello world");
  });

  test("handles mixed", () => {
    expect(normalizeQuery("  Hello   WORLD  ")).toBe("hello world");
  });

  test("empty string stays empty", () => {
    expect(normalizeQuery("")).toBe("");
  });
});
