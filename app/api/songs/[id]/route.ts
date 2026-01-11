import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await prisma.song.findUnique({
      where: { id },
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

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json(song);
  } catch (error) {
    console.error("Error fetching song:", error);
    return NextResponse.json(
      { error: "Failed to fetch song" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isPublished, lyrics, artistIds, ...updateData } = body;

    // Handle lyrics update if provided
    if (lyrics !== undefined) {
      // Delete existing lyrics
      await prisma.lyricLine.deleteMany({
        where: { songId: id },
      });

      // Create new lyrics if provided
      if (Array.isArray(lyrics) && lyrics.length > 0) {
        await prisma.lyricLine.createMany({
          data: lyrics.map((lyric: any) => ({
            songId: id,
            time: lyric.time,
            text: lyric.text,
            translation: null,
            order: lyric.order,
          })),
        });
      }
    }

    // Handle artists update if provided
    const updateSongData: any = {
      ...updateData,
      ...(isPublished !== undefined && { isPublished }),
    };

    if (artistIds !== undefined && Array.isArray(artistIds)) {
      // Delete existing artist relationships
      await prisma.songArtist.deleteMany({
        where: { songId: id },
      });

      // Create new artist relationships
      if (artistIds.length > 0) {
        updateSongData.artists = {
          create: artistIds.map((artistId: string) => ({
            artistId: artistId,
          })),
        };
      }
    }

    const song = await prisma.song.update({
      where: { id },
      data: updateSongData,
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

    return NextResponse.json(song);
  } catch (error) {
    console.error("Error updating song:", error);
    return NextResponse.json(
      { error: "Failed to update song" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.song.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting song:", error);
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    );
  }
}
