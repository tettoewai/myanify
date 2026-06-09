import { redis } from "./redis";

export const CACHE_TTL = {
  LIST: 300,
  DETAIL: 600,
  SEARCH: 60,
  SIMILAR: 120,
} as const;

export const CACHE_PREFIX = "myanify";

export type CacheHealthResult = {
  status: "ok" | "disabled" | "error";
  enabled: boolean;
  connected: boolean;
  latencyMs: number | null;
  keyCount: number;
  keys: Array<{ key: string; ttl: number }>;
  error?: string;
};

export function cacheKey(...parts: string[]): string {
  return `${CACHE_PREFIX}:${parts.join(":")}`;
}

export function cacheKeyFromRequest(
  namespace: string,
  request: Request,
  ...extra: string[]
): string {
  const url = new URL(request.url);
  const sorted = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const query = sorted.map(([key, value]) => `${key}=${value}`).join("&") || "_";
  return cacheKey(namespace, ...extra, query);
}

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60,
): Promise<T> {
  if (!redis) {
    return fetcher();
  }

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fetcher();
    await redis.setex(key, ttlSeconds, fresh);
    return fresh;
  } catch (error) {
    console.error("Cache read/write error:", error);
    return fetcher();
  }
}

export async function invalidateCache(pattern: string) {
  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
  }
}

export async function invalidateContentCache() {
  await Promise.all([
    invalidateCache(`${CACHE_PREFIX}:songs:*`),
    invalidateCache(`${CACHE_PREFIX}:songs:quick-play:*`),
    invalidateCache(`${CACHE_PREFIX}:albums:*`),
    invalidateCache(`${CACHE_PREFIX}:artists:*`),
    invalidateCache(`${CACHE_PREFIX}:genres:*`),
    invalidateCache(`${CACHE_PREFIX}:search:*`),
    invalidateCache(`${CACHE_PREFIX}:similar:*`),
  ]);
}

export async function checkCacheHealth(
  sampleLimit = 20,
): Promise<CacheHealthResult> {
  const enabled = Boolean(redis);

  if (!redis) {
    return {
      status: "disabled",
      enabled: false,
      connected: false,
      latencyMs: null,
      keyCount: 0,
      keys: [],
    };
  }

  const client = redis;
  const start = Date.now();

  try {
    await client.ping();
    const allKeys = await client.keys(`${CACHE_PREFIX}:*`);
    const sample = allKeys.slice(0, sampleLimit);
    const keys = await Promise.all(
      sample.map(async (key) => ({
        key,
        ttl: await client.ttl(key),
      })),
    );

    return {
      status: "ok",
      enabled,
      connected: true,
      latencyMs: Date.now() - start,
      keyCount: allKeys.length,
      keys,
    };
  } catch (error) {
    return {
      status: "error",
      enabled,
      connected: false,
      latencyMs: Date.now() - start,
      keyCount: 0,
      keys: [],
      error: error instanceof Error ? error.message : "Unknown cache error",
    };
  }
}
