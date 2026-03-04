import { describe, expect, it } from "bun:test";
import { createCache } from "../src/logic/cache";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("cache.ts", () => {
  it("expires entries after TTL", async () => {
    const cache = createCache<string>(0.05);

    cache.set("  Hello   World  ", "value");
    expect(cache.get("hello world")).toBe("value");

    await sleep(70);
    expect(cache.get("hello world")).toBeUndefined();

    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  it("tracks hit/miss and hit rate", () => {
    const cache = createCache<number>(60);

    cache.set("foo", 123);
    expect(cache.get("foo")).toBe(123);
    expect(cache.get("bar")).toBeUndefined();

    const s = cache.stats();
    expect(s.size).toBe(1);
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBeCloseTo(0.5, 5);
  });
});