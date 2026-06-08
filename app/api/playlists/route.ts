import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { ensureUniqueSlug } from "@/lib/slug";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    const isPublicParam = searchParams.get("isPublic");

    if (!session?.user) {
      if (isPublicParam !== "true") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const whereClause = { isPublic: true };
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
    }

    const whereClause = {
      createdById: session.user.id,
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
    const session = await getSession();

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

    const slug = await ensureUniqueSlug("playlist", name, randomUUID());

    const playlist = await prisma.playlist.create({
      data: {
        name,
        slug,
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
