import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/notifications/preferences — Get user's notification preferences.
 */
export async function GET() {
  try {
    const session = await getSession();
    const userId = (session as { user?: { id?: string } })?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/preferences — Update notification preferences.
 * Body: { newSongs?, newAlbums?, songRequestUpdates?, announcements? }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const userId = (session as { user?: { id?: string } })?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newSongs, newAlbums, songRequestUpdates, announcements } = body;

    const data: Record<string, boolean> = {};
    if (typeof newSongs === "boolean") data.newSongs = newSongs;
    if (typeof newAlbums === "boolean") data.newAlbums = newAlbums;
    if (typeof songRequestUpdates === "boolean") data.songRequestUpdates = songRequestUpdates;
    if (typeof announcements === "boolean") data.announcements = announcements;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}
