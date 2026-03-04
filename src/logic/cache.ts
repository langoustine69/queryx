import { createHash } from "node:crypto";

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  ttlSeconds: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function parseTtlSeconds(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const DEFAULT_CACHE_TTL_SECONDS = parseTtlSeconds(
  process.env.CACHE_TTL_SECONDS,
  300,
);

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCacheKey(query: string): string {
  return createHash("sha256").update(normalizeQuery(query)).digest("hex");
}

export class InMemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private readonly defaultTtlSeconds: number;

  constructor(defaultTtlSeconds: number = DEFAULT_CACHE_TTL_SECONDS) {
    this.defaultTtlSeconds = defaultTtlSeconds > 0 ? defaultTtlSeconds : 300;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number = this.defaultTtlSeconds): void {
    const safeTtl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 0;
    const expiresAt = Date.now() + safeTtl * 1000;
    this.store.set(key, { value, expiresAt });
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    this.purgeExpired();
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
      ttlSeconds: this.defaultTtlSeconds,
    };
  }
}

const cache = new InMemoryCache<unknown>(DEFAULT_CACHE_TTL_SECONDS);

export function get<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function set<T>(key: string, value: T, ttlSeconds?: number): void {
  cache.set(key, value, ttlSeconds);
}

export function stats(): CacheStats {
  return cache.stats();
}

export function clear(): void {
  cache.clear();
}

export default {
  get,
  set,
  stats,
  clear,
  getCacheKey,
  normalizeQuery,
  InMemoryCache,
};