import { createHash } from "node:crypto";

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface QueryCacheOptions {
  ttlSeconds?: number;
  now?: () => number;
}

function getDefaultTtlSeconds(): number {
  const raw = process.env.CACHE_TTL_SECONDS ?? "300";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 300;
  }
  return parsed;
}

export class QueryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  private hits = 0;
  private misses = 0;

  constructor(options: QueryCacheOptions = {}) {
    this.now = options.now ?? Date.now;
    this.defaultTtlMs = Math.max(1, (options.ttlSeconds ?? getDefaultTtlSeconds()) * 1000);
  }

  static normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
  }

  static hashQuery(query: string): string {
    return createHash("sha256").update(QueryCache.normalizeQuery(query)).digest("hex");
  }

  public keyForQuery(query: string): string {
    return QueryCache.hashQuery(query);
  }

  public set(query: string, value: T, ttlSeconds?: number): string {
    const key = this.keyForQuery(query);
    return this.setByKey(key, value, ttlSeconds);
  }

  public setByKey(key: string, value: T, ttlSeconds?: number): string {
    const ttlMs = Math.max(1, (ttlSeconds ?? this.defaultTtlMs / 1000) * 1000);
    this.store.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    });
    return key;
  }

  public get(query: string): T | undefined {
    return this.getByKey(this.keyForQuery(query));
  }

  public getByKey(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value;
  }

  public delete(query: string): boolean {
    return this.store.delete(this.keyForQuery(query));
  }

  public clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public cleanup(): void {
    const now = this.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  public stats(): CacheStats {
    this.cleanup();
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
    };
  }
}

export const cache = new QueryCache<unknown>();
export const normalizeQuery = QueryCache.normalizeQuery;
export const hashQuery = QueryCache.hashQuery;