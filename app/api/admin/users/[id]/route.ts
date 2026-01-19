import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { isPremium, role, adminPassword } = body as {
      isPremium?: boolean;
      role?: string;
      adminPassword?: string;
    };

    const data: any = {};

    if (typeof isPremium === "boolean") {
      data.isPremium = isPremium;
    }

    if (role === "ADMIN" || role === "LISTENER") {
      data.role = role;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    if (data.role || typeof data.isPremium === "boolean") {
      if (!adminPassword) {
        return NextResponse.json(
          { error: "Admin password is required for this action" },
          { status: 400 }
        );
      }

      const admin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { passwordHash: true },
      });

      if (!admin || !admin.passwordHash) {
        return NextResponse.json(
          { error: "Admin password is not set" },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(
        adminPassword,
        admin.passwordHash
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Admin password is incorrect" },
          { status: 401 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
    });

    return NextResponse.json(serializeUser(updated));
  } catch (error) {
    console.error("Error updating admin user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
