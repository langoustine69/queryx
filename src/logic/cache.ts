/**
 * In-memory cache with TTL.
 * Reduces Brave API calls on repeated queries.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class Cache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private ttlMs: number;

  constructor(ttlSeconds?: number) {
    this.ttlMs = (ttlSeconds ?? Number(process.env.CACHE_TTL_SECONDS) ?? 300) * 1000;
  }

  /**
   * Normalize a query string into a stable cache key.
   */
  static normalizeKey(query: string, params?: Record<string, string>): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
    if (!params || Object.keys(params).length === 0) return normalized;
    const sorted = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${normalized}|${sorted}`;
  }

  get(key: string): { value: T; stale: boolean } | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return { value: entry.value, stale: false };
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  stats(): CacheStats {
    // Clean expired entries
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }

    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
