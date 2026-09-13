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
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    providers: (user.accounts ?? []).map((a: any) => a.provider),
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
        accounts: { select: { provider: true, type: true } },
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
            sessions: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { plan: { select: { name: true, price: true } } },
        },
        paymentRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            planType: true,
            amount: true,
            status: true,
            referenceNumber: true,
            createdAt: true,
            verifiedAt: true,
            paymentMethod: { select: { name: true } },
            plan: { select: { name: true } },
          },
        },
        playHistory: {
          orderBy: { playedAt: "desc" },
          take: 15,
          select: {
            id: true,
            playedAt: true,
            duration: true,
            song: {
              select: {
                id: true,
                title: true,
                coverUrl: true,
                artists: {
                  select: { artist: { select: { name: true } } },
                },
              },
            },
          },
        },
        playlists: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            name: true,
            isPublic: true,
            createdAt: true,
            _count: { select: { songs: true } },
          },
        },
        likedSongs: {
          orderBy: { likedAt: "desc" },
          take: 10,
          select: {
            likedAt: true,
            song: {
              select: {
                id: true,
                title: true,
                coverUrl: true,
              },
            },
          },
        },
        likedArtists: {
          orderBy: { likedAt: "desc" },
          take: 10,
          select: {
            likedAt: true,
            artist: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        deviceLicenses: {
          orderBy: { lastValidatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
            deviceType: true,
            isValid: true,
            lastValidatedAt: true,
            createdAt: true,
          },
        },
        offlineDownloads: {
          orderBy: { downloadedAt: "desc" },
          take: 10,
          select: {
            id: true,
            downloadStatus: true,
            downloadedAt: true,
            fileSize: true,
            song: { select: { id: true, title: true } },
          },
        },
        songRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            songTitle: true,
            artistName: true,
            status: true,
            createdAt: true,
          },
        },
        sessions: {
          orderBy: { expires: "desc" },
          take: 5,
          select: { id: true, expires: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching admin user detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
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
