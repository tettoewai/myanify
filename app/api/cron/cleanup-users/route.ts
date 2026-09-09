import { NextResponse } from "next/server";
import { prisma } from "@/db";

export const maxDuration = 120;

const CLEANUP_DAYS = Number(process.env.USER_CLEANUP_DAYS || 3);

/**
 * POST /api/cron/cleanup-users
 *
 * Maintenance job that deletes unverified user accounts older than
 * CLEANUP_DAYS (default 3) days. Prevents stale, never-verified signups
 * from accumulating (and burning future Resend quota on re-registration).
 *
 * Triggered by the VPS host cron (install with scripts/install-cleanup-cron.sh).
 * Auth: bearer token matching CRON_SECRET (or falls back to RELEASE_ADMIN_TOKEN).
 */
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.CRON_SECRET || process.env.RELEASE_ADMIN_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - CLEANUP_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      emailVerified: null,
      isPremium: false,
      createdAt: { lt: cutoff },
    },
  });

  return NextResponse.json({
    ok: true,
    deleted: result.count,
    cutoff: cutoff.toISOString(),
    cleanupDays: CLEANUP_DAYS,
  });
}
