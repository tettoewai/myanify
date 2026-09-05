import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import {
  getDownloadSettings,
  updateDownloadSettings,
} from "@/lib/download-settings";
import { prisma } from "@/db";

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  return !!session?.user && session.user.role === "ADMIN";
}

/**
 * GET /api/admin/download-settings
 * Admin-only read of download tunables.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const settings = await getDownloadSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching admin download settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch download settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/download-settings
 * Body: { maxSongs?: number (1-10000), requireVip?: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { maxSongs, requireVip } = body ?? {};

    if (maxSongs !== undefined) {
      const n = Number(maxSongs);
      if (!Number.isFinite(n) || n < 1 || n > 10000) {
        return NextResponse.json(
          { error: "maxSongs must be a number between 1 and 10000" },
          { status: 400 },
        );
      }
    }
    if (requireVip !== undefined && typeof requireVip !== "boolean") {
      return NextResponse.json(
        { error: "requireVip must be a boolean" },
        { status: 400 },
      );
    }

    const settings = await updateDownloadSettings(
      {
        ...(maxSongs !== undefined ? { maxSongs: Math.floor(Number(maxSongs)) } : {}),
        ...(requireVip !== undefined ? { requireVip } : {}),
      },
      session!.user.id,
    );

    // If admin re-enables VIP requirement, nothing to expire proactively
    // (non-VIP rows remain but future downloads + playback are gated).
    // If admin lowers maxSongs, trim oldest COMPLETED extras to EXPIRED so
    // the new cap takes effect immediately.
    try {
      const overLimitUsers = await prisma.$queryRaw<
        { userId: string; count: bigint }[]
      >`SELECT "userId", COUNT(*)::bigint AS count FROM "OfflineDownload"
        WHERE "downloadStatus" IN ('COMPLETED','DOWNLOADING')
        GROUP BY "userId" HAVING COUNT(*) > ${settings.maxSongs}`;
      for (const row of overLimitUsers) {
        const excess = Number(row.count) - settings.maxSongs;
        if (excess <= 0) continue;
        const oldest = await prisma.offlineDownload.findMany({
          where: {
            userId: row.userId,
            downloadStatus: { in: ["COMPLETED", "DOWNLOADING"] },
          },
          orderBy: { downloadedAt: "asc" },
          take: excess,
          select: { id: true },
        });
        if (oldest.length > 0) {
          await prisma.offlineDownload.updateMany({
            where: { id: { in: oldest.map((d) => d.id) } },
            data: { downloadStatus: "EXPIRED" },
          });
        }
      }
    } catch (trimError) {
      console.error("Failed to trim downloads to new cap:", trimError);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating admin download settings:", error);
    return NextResponse.json(
      { error: "Failed to update download settings" },
      { status: 500 },
    );
  }
}
