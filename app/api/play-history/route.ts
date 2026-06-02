import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { updateMonthlyListenersForPlay } from "@/lib/monthly-listeners";
import { formatSongResponse } from "@/lib/song-response";

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Get play history for the current user, ordered by most recent first
    const playHistory = await prisma.playHistory.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        song: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
            album: true,
            genre: true,
          },
        },
      },
      orderBy: {
        playedAt: "desc",
      },
      take: limit,
      skip,
    });

    // Transform to return songs with play history metadata and artist names
    const songs = playHistory.map((entry) => {
      const song = entry.song;
      const artistNames = song.artists
        ?.map((sa: any) => sa.artist?.name)
        .filter(Boolean)
        .join(", ") || "Unknown Artist";

      return formatSongResponse(
        {
          ...song,
          artist: artistNames,
          playedAt: entry.playedAt,
          duration: entry.duration,
        },
        request
      );
    });

    return NextResponse.json({ data: songs });
  } catch (error) {
    console.error("Error fetching play history:", error);
    return NextResponse.json(
      { error: "Failed to fetch play history" },
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
    const { songId, duration } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 }
      );
    }

    // Verify song exists and get its artists
    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Create play history entry and increment song play count
    const [playHistory] = await prisma.$transaction([
      prisma.playHistory.create({
        data: {
          userId: session.user.id,
          songId,
          duration: duration ? parseInt(String(duration)) : null,
        },
        include: {
          song: {
            include: {
              artists: {
                include: {
                  artist: true,
                },
              },
              album: true,
              genre: true,
            },
          },
        },
      }),
      prisma.song.update({
        where: { id: songId },
        data: {
          playCount: { increment: 1 },
        },
      }),
    ]);

    // Keep artist listener counts in sync before responding. Detached promises can
    // be stopped by serverless runtimes, which leaves some artists stuck at 0.
    if (song.artists && song.artists.length > 0) {
      await Promise.all(
        song.artists.map((sa: any) =>
          updateMonthlyListenersForPlay(
            sa.artistId,
            session.user.id,
            playHistory.id
          )
        )
      );
    }

    return NextResponse.json(playHistory, { status: 201 });
  } catch (error) {
    console.error("Error creating play history:", error);
    return NextResponse.json(
      { error: "Failed to create play history" },
      { status: 500 }
    );
  }
}
