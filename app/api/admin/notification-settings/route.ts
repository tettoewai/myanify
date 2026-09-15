import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/lib/notification-settings";

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  return !!session?.user && session.user.role === "ADMIN";
}

/**
 * GET /api/admin/notification-settings
 * Admin-only read of global notification toggles.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const settings = await getNotificationSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching admin notification settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/notification-settings
 * Body: { newSongs?, newSongsOnlyLiked?, newAlbums?, songRequestUpdates?, announcements? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { newSongs, newSongsOnlyLiked, newAlbums, songRequestUpdates, announcements } = body ?? {};

    if (newSongs !== undefined && typeof newSongs !== "boolean") {
      return NextResponse.json(
        { error: "newSongs must be a boolean" },
        { status: 400 },
      );
    }
    if (newSongsOnlyLiked !== undefined && typeof newSongsOnlyLiked !== "boolean") {
      return NextResponse.json(
        { error: "newSongsOnlyLiked must be a boolean" },
        { status: 400 },
      );
    }
    if (newAlbums !== undefined && typeof newAlbums !== "boolean") {
      return NextResponse.json(
        { error: "newAlbums must be a boolean" },
        { status: 400 },
      );
    }
    if (songRequestUpdates !== undefined && typeof songRequestUpdates !== "boolean") {
      return NextResponse.json(
        { error: "songRequestUpdates must be a boolean" },
        { status: 400 },
      );
    }
    if (announcements !== undefined && typeof announcements !== "boolean") {
      return NextResponse.json(
        { error: "announcements must be a boolean" },
        { status: 400 },
      );
    }

    const settings = await updateNotificationSettings(
      {
        ...(newSongs !== undefined ? { newSongs } : {}),
        ...(newSongsOnlyLiked !== undefined ? { newSongsOnlyLiked } : {}),
        ...(newAlbums !== undefined ? { newAlbums } : {}),
        ...(songRequestUpdates !== undefined ? { songRequestUpdates } : {}),
        ...(announcements !== undefined ? { announcements } : {}),
      },
      session!.user.id,
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating admin notification settings:", error);
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 },
    );
  }
}
