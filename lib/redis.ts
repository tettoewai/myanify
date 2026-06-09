import { Redis } from "@upstash/redis";

export function isCacheEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function createRedis(): Redis | null {
  if (!isCacheEnabled()) {
    return null;
  }

  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

export const redis = createRedis();
