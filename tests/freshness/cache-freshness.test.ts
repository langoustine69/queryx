/**
 * Freshness/cache tests — TTL behaviour, staleness metadata.
 * Note: Cache constructor takes ttlSeconds (multiplied by 1000 internally).
 */
import { describe, test, expect } from "bun:test";
import { Cache } from "../../src/logic/cache";

describe("Cache TTL", () => {
  test("returns cached value within TTL", () => {
    const cache = new Cache<string>(60); // 60 seconds
    cache.set("key", "value");
    const result = cache.get("key");
    expect(result).not.toBeNull();
    expect(result!.value).toBe("value");
    expect(result!.stale).toBe(false);
  });

  test("returns null after TTL expires", async () => {
    const cache = new Cache<string>(0.001); // 1ms = 0.001 seconds
    cache.set("key", "value");
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.get("key")).toBeNull();
  });

  test("tracks hit/miss stats", () => {
    const cache = new Cache<string>(60);
    cache.set("a", "1");
    cache.get("a"); // hit
    cache.get("b"); // miss
    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  test("clear empties cache", () => {
    const cache = new Cache<string>(60);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeNull();
    expect(cache.stats().size).toBe(0);
  });

  test("normalizeKey produces stable keys", () => {
    expect(Cache.normalizeKey("Hello World")).toBe("hello world");
    expect(Cache.normalizeKey("test", { b: "2", a: "1" })).toBe(
      "test|a=1&b=2"
    );
  });
});
