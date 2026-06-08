import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export function isRateLimitEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function createRedis(): Redis | null {
  if (!isRateLimitEnabled()) {
    return null;
  }

  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

const redis = createRedis();

function createLimiter(
  prefix: string,
  limit: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`,
): Ratelimit | null {
  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
  });
}

// Login and credential-sensitive routes
export const authLimiter = createLimiter("rl:auth", 10, "15 m");

// Broad API protection (applied in proxy.ts)
export const apiLimiter = createLimiter("rl:api", 100, "1 m");

// Audio streaming proxy
export const streamLimiter = createLimiter("rl:stream", 300, "1 m");

// Image proxy
export const proxyLimiter = createLimiter("rl:proxy", 100, "1 m");

// File uploads (per user)
export const uploadLimiter = createLimiter("rl:upload", 10, "1 h");

// Write-heavy endpoints (play history, ad tracking)
export const writeLimiter = createLimiter("rl:write", 120, "1 m");

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function enforceRateLimit(
  request: Request,
  limiter: Ratelimit | null,
  keySuffix = "",
): Promise<Response | null> {
  if (!limiter) {
    return null;
  }

  const ip = getClientIp(request);
  const key = keySuffix ? `${ip}:${keySuffix}` : ip;
  const result = await limiter.limit(key);

  if (!result.success) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((result.reset - Date.now()) / 1000),
          ),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      },
    );
  }

  return null;
}

export async function enforceMiddlewareRateLimit(
  request: NextRequest,
): Promise<Response | null> {
  const pathname = request.nextUrl.pathname;

  // Skip NextAuth internal routes — they have their own flow
  if (pathname.startsWith("/api/auth/")) {
    return null;
  }

  return enforceRateLimit(request, apiLimiter, pathname);
}
