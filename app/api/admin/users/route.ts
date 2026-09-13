import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

function serializeUser(user: any) {
  const latestSubscription = user.subscriptions?.[0] || null;
  const latestPlay = user.playHistory?.[0] || null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isPremium: user.isPremium,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    providers: (user.accounts ?? []).map((a: any) => a.provider),
    lastActiveAt: latestPlay?.playedAt ?? null,
    stats: {
      playlists: user._count?.playlists ?? 0,
      likedSongs: user._count?.likedSongs ?? 0,
      likedArtists: user._count?.likedArtists ?? 0,
      playHistory: user._count?.playHistory ?? 0,
      paymentRequests: user._count?.paymentRequests ?? 0,
      songRequests: user._count?.songRequests ?? 0,
      offlineDownloads: user._count?.offlineDownloads ?? 0,
      deviceLicenses: user._count?.deviceLicenses ?? 0,
    },
    subscription: latestSubscription
      ? {
          status: latestSubscription.status,
          planType: latestSubscription.planType,
          startDate: latestSubscription.startDate,
          endDate: latestSubscription.endDate,
        }
      : null,
  };
}

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "email"
  | "mostActive"
  | "mostLiked";

function buildOrderBy(sort: SortKey): any {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { name: "asc" };
    case "email":
      return { email: "asc" };
    case "mostActive":
      return { playHistory: { _count: "desc" } };
    case "mostLiked":
      return { likedSongs: { _count: "desc" } };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50"))
    );
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const vip = searchParams.get("vip");
    const subscription = searchParams.get("subscription") || "all";
    const joined = searchParams.get("joined") || "all";
    const verified = searchParams.get("verified") || "all";
    const sort = (searchParams.get("sort") || "newest") as SortKey;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role === "ADMIN" || role === "LISTENER") {
      where.role = role;
    }

    if (vip === "true") {
      where.isPremium = true;
    } else if (vip === "false") {
      where.isPremium = false;
    }

    // Subscription status filter
    if (subscription === "active") {
      where.subscriptions = { some: { status: "ACTIVE" } };
    } else if (subscription === "expired") {
      where.subscriptions = { some: { status: "EXPIRED" } };
    } else if (subscription === "cancelled") {
      where.subscriptions = { some: { status: "CANCELLED" } };
    } else if (subscription === "none") {
      where.subscriptions = { none: {} };
    }

    // Joined date filter
    const now = new Date();
    if (joined === "7d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      where.createdAt = { gte: d };
    } else if (joined === "30d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      where.createdAt = { gte: d };
    }

    // Email verification filter
    if (verified === "verified") {
      where.emailVerified = { not: null };
    } else if (verified === "unverified") {
      where.emailVerified = null;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: buildOrderBy(sort),
        take: limit,
        skip,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isPremium: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          accounts: { select: { provider: true } },
          playHistory: {
            orderBy: { playedAt: "desc" },
            take: 1,
            select: { playedAt: true },
          },
          _count: {
            select: {
              playlists: true,
              likedSongs: true,
              likedArtists: true,
              playHistory: true,
              paymentRequests: true,
              songRequests: true,
              offlineDownloads: true,
              deviceLicenses: true,
            },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    const data = users.map(serializeUser);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
