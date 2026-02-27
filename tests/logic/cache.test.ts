import { describe, it, expect, beforeEach } from "bun:test";
import { Cache } from "../../src/logic/cache";

describe("Cache", () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>(1); // 1 second TTL for testing
  });

  it("returns null for cache miss", () => {
    expect(cache.get("nonexistent")).toBeNull();
  });

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    const result = cache.get("key1");
    expect(result).not.toBeNull();
    expect(result!.value).toBe("value1");
    expect(result!.stale).toBe(false);
  });

  it("expires entries after TTL", async () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).not.toBeNull();

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 1100));
    expect(cache.get("key1")).toBeNull();
  });

  it("tracks hit/miss stats", () => {
    cache.set("a", "1");
    cache.get("a"); // hit
    cache.get("b"); // miss
    cache.get("a"); // hit

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    expect(stats.size).toBe(1);
  });

  it("clears all entries and stats", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a");
    cache.clear();

    expect(cache.get("a")).toBeNull();
    const stats = cache.stats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(1); // The get("a") after clear
  });

  it("returns 0 hit rate when no queries", () => {
    expect(cache.stats().hitRate).toBe(0);
  });
});

describe("Cache.normalizeKey", () => {
  it("lowercases and trims query", () => {
    expect(Cache.normalizeKey("  Hello World  ")).toBe("hello world");
  });

  it("collapses whitespace", () => {
    expect(Cache.normalizeKey("hello   world")).toBe("hello world");
  });

  it("appends sorted params", () => {
    const key = Cache.normalizeKey("test", { z: "1", a: "2" });
    expect(key).toBe("test|a=2&z=1");
  });

  it("ignores empty params", () => {
    expect(Cache.normalizeKey("test", {})).toBe("test");
  });
});
