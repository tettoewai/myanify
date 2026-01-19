import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

function serializeUser(user: any) {
  const latestSubscription = user.subscriptions?.[0] || null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isPremium: user.isPremium,
    createdAt: user.createdAt,
    stats: {
      playlists: user._count?.playlists ?? 0,
      likedSongs: user._count?.likedSongs ?? 0,
      likedArtists: user._count?.likedArtists ?? 0,
      playHistory: user._count?.playHistory ?? 0,
    },
    subscription: latestSubscription
      ? {
          status: latestSubscription.status,
          planType: latestSubscription.planType,
          endDate: latestSubscription.endDate,
        }
      : null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const vip = searchParams.get("vip");

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

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          _count: {
            select: {
              playlists: true,
              likedSongs: true,
              likedArtists: true,
              playHistory: true,
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

