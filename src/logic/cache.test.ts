import { describe, expect, it } from "bun:test";
import { QueryCache } from "./cache";

describe("cache.ts", () => {
  it("expires entries based on TTL", () => {
    let now = 0;
    const cache = new QueryCache<string>({
      ttlSeconds: 1,
      now: () => now,
    });

    cache.set("Hello World", "value");
    expect(cache.get("hello world")).toBe("value");

    now = 1001;
    expect(cache.get("hello world")).toBeUndefined();
  });

  it("tracks hit/miss stats and normalizes query keys", () => {
    let now = 0;
    const cache = new QueryCache<string>({
      ttlSeconds: 60,
      now: () => now,
    });

    expect(cache.get("missing key")).toBeUndefined(); // miss
    cache.set("  Query   X  ", "cached");
    expect(cache.get("query x")).toBe("cached"); // hit
    expect(cache.get("QUERY    X")).toBe("cached"); // hit

    now = 61_000;
    expect(cache.get("query x")).toBeUndefined(); // expired miss

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.size).toBe(0);
  });
});