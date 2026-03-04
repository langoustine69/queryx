import { createHash } from "node:crypto";

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

function getDefaultTtlSeconds(): number {
  const raw = process.env.CACHE_TTL_SECONDS;
  const parsed = raw ? Number(raw) : 300;
  if (!Number.isFinite(parsed) || parsed <= 0) return 300;
  return parsed;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuery(normalizedQuery: string): string {
  return createHash("sha256").update(normalizedQuery).digest("hex");
}

export function getCacheKey(query: string): string {
  return hashQuery(normalizeQuery(query));
}

export class InMemoryCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly defaultTtlSeconds: number;
  private hits = 0;
  private misses = 0;

  constructor(defaultTtlSeconds = getDefaultTtlSeconds()) {
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  private purgeExpired(now = Date.now()): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  get<T>(query: string): T | undefined {
    const key = getCacheKey(query);
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
    return entry.value as T;
  }

  set<T>(query: string, value: T, ttlSeconds?: number): void {
    const resolvedTtlSeconds =
      typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) && ttlSeconds > 0
        ? ttlSeconds
        : this.defaultTtlSeconds;

    const expiresAt = Date.now() + resolvedTtlSeconds * 1000;
    const key = getCacheKey(query);

    this.store.set(key, { value, expiresAt });
    this.purgeExpired();
  }

  stats(): CacheStats {
    this.purgeExpired();
    const total = this.hits + this.misses;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

const singletonCache = new InMemoryCache();

export function get<T>(query: string): T | undefined {
  return singletonCache.get<T>(query);
}

export function set<T>(query: string, value: T, ttlSeconds?: number): void {
  singletonCache.set(query, value, ttlSeconds);
}

export function stats(): CacheStats {
  return singletonCache.stats();
}

export const cache = singletonCache;
export default singletonCache;