import { describe, test, expect, beforeEach } from "bun:test";
import { Cache } from "../../src/logic/cache";

describe("Cache", () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>(1); // 1 second TTL
  });

  test("returns null for cache miss", () => {
    const result = cache.get("nonexistent");
    expect(result).toBeNull();
  });

  test("returns value for cache hit", () => {
    cache.set("key", "value");
    const result = cache.get("key");
    expect(result).not.toBeNull();
    expect(result!.value).toBe("value");
    expect(result!.stale).toBe(false);
  });

  test("returns null after TTL expiry", async () => {
    cache = new Cache<string>(0.1); // 100ms TTL
    cache.set("key", "value");
    await new Promise((r) => setTimeout(r, 150));
    const result = cache.get("key");
    expect(result).toBeNull();
  });

  test("tracks hit/miss stats", () => {
    cache.set("a", "1");
    cache.get("a"); // hit
    cache.get("a"); // hit
    cache.get("b"); // miss

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
  });

  test("clear resets everything", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a");
    cache.clear();

    const stats = cache.stats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.size).toBe(0);
    expect(cache.get("a")).toBeNull();
  });

  test("hitRate is 0 when no operations", () => {
    expect(cache.stats().hitRate).toBe(0);
  });
});

describe("Cache.normalizeKey", () => {
  test("normalizes query to lowercase and trimmed", () => {
    expect(Cache.normalizeKey("  Hello World  ")).toBe("hello world");
  });

  test("collapses whitespace", () => {
    expect(Cache.normalizeKey("hello   world")).toBe("hello world");
  });

  test("includes sorted params", () => {
    const key = Cache.normalizeKey("query", { z: "1", a: "2" });
    expect(key).toBe("query|a=2&z=1");
  });

  test("omits params when empty", () => {
    expect(Cache.normalizeKey("query", {})).toBe("query");
  });
});
