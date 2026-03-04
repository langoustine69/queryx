import { createHash } from "node:crypto";

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  ttlSeconds: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
  now?: () => number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = (() => {
  const raw = Number(process.env.CACHE_TTL_SECONDS ?? 300);
  return Number.isFinite(raw) && raw > 0 ? raw : 300;
})();

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuery(normalizedQuery: string): string {
  return createHash("sha256").update(normalizedQuery).digest("hex");
}

export class InMemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly now: () => number;
  private readonly ttlSeconds: number;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  }

  keyForQuery(query: string): string {
    return hashQuery(normalizeQuery(query));
  }

  get(query: string): T | undefined {
    this.purgeExpired();
    const key = this.keyForQuery(query);
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

  set(query: string, value: T, ttlSeconds = this.ttlSeconds): string {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error("Cache TTL must be a positive number.");
    }

    const key = this.keyForQuery(query);
    const expiresAt = this.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
    return key;
  }

  stats(): CacheStats {
    this.purgeExpired();
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

  private purgeExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new InMemoryCache<unknown>();
export const queryCache = cache;

export default cache;