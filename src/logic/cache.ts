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

function parseDefaultTtlSeconds(): number {
  const raw = process.env.CACHE_TTL_SECONDS;
  const parsed = raw ? Number(raw) : 300;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 300;
  }
  return parsed;
}

export function normalizeQuery(query: string): string {
  return query.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizedQueryHash(query: string): string {
  const normalized = normalizeQuery(query);
  return createHash("sha256").update(normalized).digest("hex");
}

export class InMemoryCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly now: () => number;
  private readonly defaultTtlSeconds: number;
  private hits = 0;
  private misses = 0;

  constructor(ttlSeconds: number = parseDefaultTtlSeconds(), now: () => number = () => Date.now()) {
    this.defaultTtlSeconds = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 300;
    this.now = now;
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  private keyForQuery(query: string): string {
    return normalizedQueryHash(query);
  }

  public get(query: string): T | undefined {
    this.purgeExpired();
    const key = this.keyForQuery(query);
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.misses += 1;
      return undefined;
    }

    this.hits += 1;
    return entry.value;
  }

  public set(query: string, value: T, ttlSeconds?: number): void {
    this.purgeExpired();
    const key = this.keyForQuery(query);
    const effectiveTtl = Number.isFinite(ttlSeconds) && (ttlSeconds as number) > 0 ? (ttlSeconds as number) : this.defaultTtlSeconds;
    const expiresAt = this.now() + effectiveTtl * 1000;

    this.entries.set(key, { value, expiresAt });
  }

  public stats(): CacheStats {
    this.purgeExpired();
    const total = this.hits + this.misses;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
      size: this.entries.size,
      ttlSeconds: this.defaultTtlSeconds,
    };
  }

  public clear(): void {
    this.entries.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const queryCache = new InMemoryCache<unknown>();
export default queryCache;