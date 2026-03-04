import { createHash } from "node:crypto";

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
  now?: () => number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_SECONDS = 300;

function readDefaultTtl(): number {
  const raw = process.env.CACHE_TTL_SECONDS;
  const parsed = raw ? Number(raw) : DEFAULT_TTL_SECONDS;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TTL_SECONDS;
  return Math.floor(parsed);
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashQuery(query: string): string {
  return createHash("sha256").update(normalizeQuery(query)).digest("hex");
}

export class QueryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    const ttlSeconds = options.ttlSeconds ?? readDefaultTtl();
    this.defaultTtlMs = Math.max(1, ttlSeconds * 1000);
    this.now = options.now ?? (() => Date.now());
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }

  get(query: string): T | undefined {
    const key = hashQuery(query);
    const now = this.now();
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

  set(query: string, value: T, ttlSeconds?: number): void {
    const key = hashQuery(query);
    const ttlMs = Math.max(
      1,
      (ttlSeconds && Number.isFinite(ttlSeconds)
        ? ttlSeconds
        : this.defaultTtlMs / 1000) * 1000
    );
    this.store.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
    });
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

export const cache = new QueryCache<unknown>();
export default cache;