import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

// POST /api/announcements/read { ids: string[] } — mark as read (auth required,
// works for web session + mobile Bearer token via getSession).
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const ids: unknown = body?.ids ?? body?.id;
    const list = (Array.isArray(ids) ? ids : ids ? [ids] : []).filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );
    if (list.length === 0) {
      return NextResponse.json(
        { error: "ids (string[]) is required" },
        { status: 400 },
      );
    }
    await prisma.announcementRead.createMany({
      data: list.map((announcementId) => ({ announcementId, userId })),
      skipDuplicates: true,
    });
    return NextResponse.json({ success: true, marked: list.length });
  } catch (error) {
    console.error("Error marking announcements read:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 },
    );
  }
}
