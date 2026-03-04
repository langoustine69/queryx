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

function getDefaultTtlSeconds(): number {
  const parsed = Number(process.env.CACHE_TTL_SECONDS);
  if (!Number.isFinite(parsed) || parsed <= 0) return 300;
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
  private hits = 0;
  private misses = 0;
  private readonly defaultTtlSeconds: number;

  constructor(ttlSeconds: number = getDefaultTtlSeconds()) {
    this.defaultTtlSeconds = ttlSeconds;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }

  get(query: string): T | undefined {
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

  set(query: string, value: T, ttlSeconds?: number): void {
    const key = hashQuery(query);
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const ttlMs = Math.max(1, Math.round(ttl * 1000));

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    this.pruneExpired();
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.store.size,
    };
  }
}

const sharedCache = new InMemoryCache<unknown>();

export function get<T>(query: string): T | undefined {
  return sharedCache.get(query) as T | undefined;
}

export function set<T>(query: string, value: T, ttlSeconds?: number): void {
  sharedCache.set(query, value, ttlSeconds);
}

export function stats(): CacheStats {
  return sharedCache.stats();
}

export function clear(): void {
  sharedCache.clear();
}