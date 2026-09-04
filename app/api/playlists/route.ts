import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { ensureUniqueSlug } from "@/lib/slug";

function clampPagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const rawPage = parseInt(searchParams.get("page") || "1");
  const rawLimit = parseInt(searchParams.get("limit") || "50");
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(100, Math.max(1, rawLimit))
    : 50;
  return { page, limit, skip: (page - 1) * limit };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = clampPagination(searchParams);
    const isPublicParam = searchParams.get("isPublic");

    if (isPublicParam === "true") {
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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const validSongIds: string[] = Array.isArray(songIds)
      ? [...new Set(songIds.filter((id: unknown) => typeof id === "string"))]
      : [];

    if (validSongIds.length > 0) {
      const existingCount = await prisma.song.count({
        where: { id: { in: validSongIds } },
      });
      if (existingCount !== validSongIds.length) {
        return NextResponse.json(
          { error: "One or more songs do not exist" },
          { status: 400 },
        );
      }
    }

    const playlist = await prisma.$transaction(async (tx) => {
      const created = await tx.playlist.create({
        data: {
          name,
          slug,
          description,
          coverUrl,
          isPublic: isPublic ?? true,
          createdById: session.user.id,
        },
      });

      if (validSongIds.length > 0) {
        await tx.playlistSong.createMany({
          data: validSongIds.map((songId, index) => ({
            playlistId: created.id,
            songId,
            order: index,
          })),
        });
      }

      return tx.playlist.findUniqueOrThrow({
        where: { id: created.id },
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
    });

    return NextResponse.json(playlist, { status: 201 });
  } catch (error) {
    console.error("Error creating playlist:", error);
    return NextResponse.json(
      { error: "Failed to create playlist" },
      { status: 500 }
    );
  }
}
