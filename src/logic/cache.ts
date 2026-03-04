import { createHash } from "node:crypto";

export interface CacheStats {
  hits: number;
  misses: number;
  requests: number;
  hitRate: number;
  size: number;
  ttlSeconds: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = 300;

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuery(normalizedQuery: string): string {
  return createHash("sha256").update(normalizedQuery).digest("hex");
}

export function makeCacheKey(query: string): string {
  return hashQuery(normalizeQuery(query));
}

export function getDefaultCacheTtlSeconds(): number {
  const raw = process.env.CACHE_TTL_SECONDS;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_SECONDS;
  return parsed;
}

function sanitizeTtl(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return DEFAULT_TTL_SECONDS;
  return ttlSeconds;
}

export class QueryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private readonly ttlSeconds: number;

  constructor(options: CacheOptions = {}) {
    this.ttlSeconds = sanitizeTtl(options.ttlSeconds ?? getDefaultCacheTtlSeconds());
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  get(query: string): T | undefined {
    return this.getByKey(makeCacheKey(query));
  }

  getByKey(key: string): T | undefined {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= now) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value;
  }

  set(query: string, value: T, ttlSeconds?: number): string {
    const key = makeCacheKey(query);
    this.setByKey(key, value, ttlSeconds);
    return key;
  }

  setByKey(key: string, value: T, ttlSeconds?: number): void {
    const effectiveTtl = sanitizeTtl(ttlSeconds ?? this.ttlSeconds);
    const expiresAt = Date.now() + effectiveTtl * 1000;
    this.store.set(key, { value, expiresAt });
  }

  stats(): CacheStats {
    this.pruneExpired();
    const requests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      requests,
      hitRate: requests === 0 ? 0 : this.hits / requests,
      size: this.store.size,
      ttlSeconds: this.ttlSeconds,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const cache = new QueryCache<unknown>();