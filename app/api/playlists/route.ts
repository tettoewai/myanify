import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel for better performance
    const whereClause = {
      ...(userId && { createdById: userId }),
      ...(isPublic !== null && { isPublic: isPublic === "true" }),
    };

    const [total, playlists] = await Promise.all([
      prisma.playlist.count({ where: whereClause }),
      prisma.playlist.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          songs: {
            include: {
              song: {
                include: {
                  artists: {
                    include: {
                      artist: true,
                    },
                  },
                  album: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, coverUrl, isPublic, songIds } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Playlist name is required" },
        { status: 400 }
      );
    }

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        coverUrl,
        isPublic: isPublic ?? true,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        songs: {
          include: {
            song: {
              include: {
                artists: {
                  include: {
                    artist: true,
                  },
                },
                album: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    // If songIds are provided, add them to the playlist
    if (songIds && songIds.length > 0) {
      const playlistSongs = songIds.map((songId: string, index: number) => ({
        playlistId: playlist.id,
        songId,
        order: index,
      }));

      await prisma.playlistSong.createMany({
        data: playlistSongs,
      });
    }

    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
