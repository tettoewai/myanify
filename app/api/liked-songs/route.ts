import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

// GET - Fetch user's liked songs
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const likedSongs = await prisma.likedSong.findMany({
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
            lyrics: {
              where: {
                language: "my",
              },
            },
          },
        },
      },
      orderBy: {
        likedAt: "desc",
      },
    });

    // Transform to return songs with liked metadata and artist names
    const songs = likedSongs.map((entry) => {
      const song = entry.song;
      const artistNames =
        song.artists
          ?.map((sa: any) => sa.artist?.name)
          .filter(Boolean)
          .join(", ") || "Unknown Artist";

      const lyricsRow = (song as any).lyrics?.[0];
      const lines = Array.isArray(lyricsRow?.lines) ? lyricsRow.lines : [];

      return {
        ...song,
        lyrics: lines,
        artist: artistNames,
        likedAt: entry.likedAt,
      };
    });

    return NextResponse.json({ data: songs });
  } catch (error) {
    console.error("Error fetching liked songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked songs" },
      { status: 500 }
    );
  }
}

// POST - Like a song
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 }
      );
    }

    // Verify song exists
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Check if already liked
    const existingLike = await prisma.likedSong.findUnique({
      where: {
        userId_songId: {
          userId: session.user.id,
          songId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: "Song already liked" },
        { status: 409 }
      );
    }

    // Create liked song entry
    const likedSong = await prisma.likedSong.create({
      data: {
        userId: session.user.id,
        songId,
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
            lyrics: {
              where: {
                language: "my",
              },
            },
          },
        },
      },
    });

    // Transform to return song with liked metadata and artist names
    const lyricsRow = (likedSong.song as any).lyrics?.[0];
    const lines = Array.isArray(lyricsRow?.lines) ? lyricsRow.lines : [];
    const songWithMetadata = {
      ...likedSong.song,
      lyrics: lines,
      artist:
        likedSong.song.artists
          ?.map((sa: any) => sa.artist?.name)
          .filter(Boolean)
          .join(", ") || "Unknown Artist",
      likedAt: likedSong.likedAt,
    };

    return NextResponse.json(songWithMetadata, { status: 201 });
  } catch (error) {
    console.error("Error liking song:", error);
    return NextResponse.json({ error: "Failed to like song" }, { status: 500 });
  }
}

// DELETE - Unlike a song
export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 }
      );
    }

    // Delete liked song entry
    await prisma.likedSong.delete({
      where: {
        userId_songId: {
          userId: session.user.id,
          songId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking song:", error);
    return NextResponse.json(
      { error: "Failed to unlike song" },
      { status: 500 }
    );
  }
}
