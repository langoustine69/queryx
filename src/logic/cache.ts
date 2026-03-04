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
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuery(query: string): string {
  const normalized = normalizeQuery(query);
  return createHash("sha256").update(normalized).digest("hex");
}

export class InMemoryTTLCache<T> {
  private readonly ttlMs: number;
  private readonly ttlSeconds: number;
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(ttlSeconds = 300) {
    this.ttlSeconds = ttlSeconds;
    this.ttlMs = ttlSeconds * 1000;
  }

  get(query: string): T | undefined {
    this.pruneExpired();
    const key = hashQuery(query);
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

  set(query: string, value: T): string {
    this.pruneExpired();
    const key = hashQuery(query);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
    return key;
  }

  stats(): CacheStats {
    this.pruneExpired();
    const total = this.hits + this.misses;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
      ttlSeconds: this.ttlSeconds,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

export function createCache<T>(ttlSeconds = parseTtlSeconds(process.env.CACHE_TTL_SECONDS, 300)): InMemoryTTLCache<T> {
  return new InMemoryTTLCache<T>(ttlSeconds);
}

const defaultCache = createCache<unknown>();

export function get<T = unknown>(query: string): T | undefined {
  return defaultCache.get(query) as T | undefined;
}

export function set<T = unknown>(query: string, value: T): string {
  return defaultCache.set(query, value);
}

export function stats(): CacheStats {
  return defaultCache.stats();
}

export default {
  get,
  set,
  stats,
  normalizeQuery,
  hashQuery,
};