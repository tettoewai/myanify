import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      duration,
      audioUrl,
      coverUrl,
      artistId, // Support single artistId for backward compatibility
      artistIds, // Support multiple artistIds
      genreId,
      albumId,
      isPremium,
      isPublished,
      lyrics,
    } = body;

    // Validate required fields - support both single and multiple artists
    const artistIdsArray = artistIds && Array.isArray(artistIds) && artistIds.length > 0
      ? artistIds
      : artistId
      ? [artistId]
      : [];

    if (!title || !duration || !audioUrl || artistIdsArray.length === 0) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, duration, audioUrl, and at least one artistId",
        },
        { status: 400 }
      );
    }

    // Create song with lyrics and artists
    const song = await prisma.song.create({
      data: {
        title,
        duration: parseInt(duration),
        audioUrl,
        coverUrl: coverUrl || null,
        genreId: genreId || null,
        albumId: albumId || null,
        isPremium: isPremium || false,
        isPublished: isPublished || false,
        artists: {
          create: artistIdsArray.map((id: string) => ({
            artistId: id,
          })),
        },
        lyrics: lyrics && Array.isArray(lyrics) && lyrics.length > 0
          ? {
              create: lyrics.map((lyric: any) => ({
                time: lyric.time,
                text: lyric.text,
                translation: null,
                order: lyric.order,
              })),
            }
          : undefined,
      },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
        album: true,
        genre: true,
        lyrics: {
          orderBy: { time: "asc" },
        },
      },
    });

    return NextResponse.json(song, { status: 201 });
  } catch (error) {
    console.error("Error creating song:", error);
    return NextResponse.json(
      { error: "Failed to create song" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genreId = searchParams.get("genreId");
    const artistId = searchParams.get("artistId");
    const albumId = searchParams.get("albumId");
    const isPublishedParam = searchParams.get("isPublished");
    const isPublished = isPublishedParam === null ? undefined : isPublishedParam === "true";
    const search = searchParams.get("search") || searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause with search support
    const where: any = {
      ...(isPublished !== undefined && { isPublished }),
      ...(genreId && { genreId }),
      ...(albumId && { albumId }),
    };

    // Filter by artistId if provided (using the many-to-many relationship)
    if (artistId) {
      where.artists = {
        some: {
          artistId: artistId,
        },
      };
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { artists: { some: { artist: { name: { contains: search, mode: "insensitive" } } } } },
      ];
    }

    // Execute count and data queries in parallel for better performance
    const [total, songs] = await Promise.all([
      prisma.song.count({ where }),
      prisma.song.findMany({
        where,
        include: {
          artists: {
            include: {
              artist: true,
            },
          },
          album: true,
          genre: true,
          lyrics: {
            orderBy: { time: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: songs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
