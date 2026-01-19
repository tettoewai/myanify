import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        artistGenres: {
          include: {
            genre: true,
          },
        },
        songs: {
          where: {
            song: {
              isPublished: true,
            },
          },
          include: {
            song: {
              include: {
                album: true,
                genre: true,
                artists: {
                  include: {
                    artist: true,
                  },
                },
                lyrics: {
                  where: {
                    language: "my",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const transformedSongs = (artist as any).songs?.map((songArtist: any) => {
      const song = songArtist.song;
      const lyricsRow = song?.lyrics?.[0];
      const lines = Array.isArray(lyricsRow?.lines) ? lyricsRow.lines : [];
      return {
        ...songArtist,
        song: {
          ...song,
          lyrics: lines,
        },
      };
    });

    const responseArtist = {
      ...artist,
      songs: transformedSongs,
    };

    return NextResponse.json(responseArtist);
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist" },
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
    await prisma.artist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting artist:", error);
    return NextResponse.json(
      { error: "Failed to delete artist" },
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
    const { name, imageUrl, bio } = body;

    const artist = await prisma.artist.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(bio !== undefined && { bio: bio || null }),
      },
    });

    return NextResponse.json(artist);
  } catch (error) {
    console.error("Error updating artist:", error);
    return NextResponse.json(
      { error: "Failed to update artist" },
      { status: 500 }
    );
  }
}
