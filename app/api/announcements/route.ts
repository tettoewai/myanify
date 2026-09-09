import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { getVIPSettings } from "@/lib/vip-settings";

function isVisibleNow(now: Date) {
  return {
    isActive: true,
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
  };
}

// GET /api/announcements — public feed of currently-visible announcements.
// Authenticated users also get `read` + `unreadCount`.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20"), 1),
      50,
    );

    const session = await getSession();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const rawIsPremium =
      (session?.user as { isPremium?: boolean } | undefined)?.isPremium ??
      false;
    // When VIP is disabled globally, everyone counts as premium.
    const vipSettings = await getVIPSettings();
    const isPremium = !vipSettings.enabled ? true : rawIsPremium;

    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        AND: [
          isVisibleNow(now),
          ...(userId
            ? [
                {
                  OR: [
                    { audience: "ALL" as const },
                    {
                      audience: (isPremium ? "PREMIUM" : "FREE") as
                        | "PREMIUM"
                        | "FREE",
                    },
                  ],
                },
              ]
            : [{ audience: "ALL" as const }]),
        ],
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: userId
        ? { reads: { where: { userId }, select: { announcementId: true } } }
        : undefined,
    });

    const data = announcements.map((a: typeof announcements[0] & { reads?: { announcementId: string }[] }) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      imageUrl: a.imageUrl,
      linkUrl: a.linkUrl,
      audience: a.audience,
      startsAt: a.startsAt,
      read: userId ? (a.reads?.length ?? 0) > 0 : undefined,
    }));

    const unreadCount = userId
      ? data.filter((d) => !d.read).length
      : data.length;

    return NextResponse.json({ data, unreadCount });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 },
    );
  }
}
