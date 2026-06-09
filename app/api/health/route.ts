import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { checkCacheHealth } from "@/lib/cache";

export async function GET() {
  const timestamp = new Date().toISOString();
  let databaseStatus: "ok" | "error" = "ok";
  let databaseLatencyMs: number | null = null;
  let databaseError: string | undefined;

  const dbStart = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseLatencyMs = Date.now() - dbStart;
  } catch (error) {
    databaseStatus = "error";
    databaseLatencyMs = Date.now() - dbStart;
    databaseError =
      error instanceof Error ? error.message : "Unknown database error";
  }

  const cache = await checkCacheHealth(5);

  const status =
    databaseStatus === "error"
      ? "error"
      : cache.status === "error"
        ? "degraded"
        : "ok";

  return NextResponse.json(
    {
      status,
      timestamp,
      checks: {
        database: {
          status: databaseStatus,
          latencyMs: databaseLatencyMs,
          ...(databaseError ? { error: databaseError } : {}),
        },
        cache: {
          status: cache.status,
          enabled: cache.enabled,
          connected: cache.connected,
          latencyMs: cache.latencyMs,
          keyCount: cache.keyCount,
          ...(cache.error ? { error: cache.error } : {}),
        },
      },
    },
    { status: databaseStatus === "error" ? 503 : 200 },
  );
}
