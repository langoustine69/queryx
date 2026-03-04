import { describe, expect, it } from "bun:test";
import { InMemoryCache } from "../../src/logic/cache";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("logic/cache", () => {
  it("expires entries after TTL", async () => {
    const cache = new InMemoryCache<string>(0.02); // 20ms
    cache.set("Queryx cache", "value");

    expect(cache.get("Queryx cache")).toBe("value");
    await sleep(30);
    expect(cache.get("Queryx cache")).toBeUndefined();

    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  it("tracks hit/miss stats and hit rate", () => {
    const cache = new InMemoryCache<string>(60);

    expect(cache.get("missing")).toBeUndefined(); // miss
    cache.set("hello world", "ok");
    expect(cache.get("hello world")).toBe("ok"); // hit

    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBe(0.5);
    expect(s.size).toBe(1);
  });
});