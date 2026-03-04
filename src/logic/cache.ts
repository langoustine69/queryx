import { createHash } from "crypto";

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

function readDefaultTtlSeconds(): number {
  const parsed = Number(process.env.CACHE_TTL_SECONDS ?? "300");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 300;
  }
  return parsed;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuery(query: string): string {
  const normalized = normalizeQuery(query);
  return createHash("sha256").update(normalized).digest("hex");
}

export class InMemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlSeconds: number;
  private hits = 0;
  private misses = 0;

  constructor(ttlSeconds: number = readDefaultTtlSeconds()) {
    this.defaultTtlSeconds = ttlSeconds > 0 ? ttlSeconds : 300;
  }

  public keyForQuery(query: string): string {
    return hashQuery(query);
  }

  public get(query: string): T | undefined {
    const key = this.keyForQuery(query);
    return this.getByKey(key);
  }

  public getByKey(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value;
  }

  public set(query: string, value: T, ttlSeconds?: number): string {
    const key = this.keyForQuery(query);
    this.setByKey(key, value, ttlSeconds);
    return key;
  }

  public setByKey(key: string, value: T, ttlSeconds?: number): void {
    const effectiveTtl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : this.defaultTtlSeconds;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl * 1000
    });
  }

  public stats(): CacheStats {
    this.cleanupExpired();
    const total = this.hits + this.misses;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
      ttlSeconds: this.defaultTtlSeconds
    };
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

const sharedCache = new InMemoryCache<unknown>();

export function get<T = unknown>(query: string): T | undefined {
  return sharedCache.get(query) as T | undefined;
}

export function set<T = unknown>(query: string, value: T, ttlSeconds?: number): string {
  return sharedCache.set(query, value, ttlSeconds);
}

export function stats(): CacheStats {
  return sharedCache.stats();
}

export function clear(): void {
  sharedCache.clear();
}

export function keyForQuery(query: string): string {
  return sharedCache.keyForQuery(query);
}

export default {
  get,
  set,
  stats,
  clear,
  keyForQuery
};