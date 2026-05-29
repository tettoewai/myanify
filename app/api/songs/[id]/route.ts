import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { formatSongResponse } from "@/lib/song-response";

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
          where: {
            language: "my",
          },
        },
      },
    });

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json(formatSongResponse(song, request));
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

    if (lyrics !== undefined) {
      await prisma.lyrics.deleteMany({
        where: { songId: id, language: "my" },
      });

      if (Array.isArray(lyrics) && lyrics.length > 0) {
        await prisma.lyrics.create({
          data: {
            songId: id,
            language: "my",
            lines: lyrics,
          },
        });
      }
    }

    // Handle artists update if provided
    const updateSongData: any = {
      ...updateData,
      ...(isPublished !== undefined && { isPublished }),
    };

    if (artistIds !== undefined && Array.isArray(artistIds)) {
      await prisma.songArtist.deleteMany({
        where: { songId: id },
      });

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
          where: {
            language: "my",
          },
        },
      },
    });

    return NextResponse.json(formatSongResponse(song, request));
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
