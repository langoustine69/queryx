import { describe, expect, test } from "bun:test";
import { QueryCache } from "../src/logic/cache";

describe("cache.ts", () => {
  test("expires entries after TTL", async () => {
    const cache = new QueryCache<string>({ ttlSeconds: 0.05 });

    cache.set("  Queryx   API  ", "cached");
    expect(cache.get("queryx api")).toBe("cached");

    await new Promise((resolve) => setTimeout(resolve, 70));

    expect(cache.get("queryx api")).toBeUndefined();
  });

  test("tracks hit/miss stats", () => {
    const cache = new QueryCache<number>({ ttlSeconds: 30 });

    cache.set("a", 1);
    cache.get("a"); // hit
    cache.get("b"); // miss

    const stats = cache.stats();

    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.size).toBe(1);
  });
});