import { NextResponse } from "next/server";
import { CACHE_TTL, checkCacheHealth } from "@/lib/cache";

export async function GET() {
  const cache = await checkCacheHealth();

  return NextResponse.json(
    {
      ...cache,
      ttl: CACHE_TTL,
      timestamp: new Date().toISOString(),
    },
    { status: cache.status === "error" ? 503 : 200 },
  );
}
