import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (playlist.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if song exists
    const existingSong = await prisma.song.findUnique({
      where: { id: songId },
      select: { id: true },
    });

    if (!existingSong) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Check if song is already in playlist
    const existingEntry = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId: id,
          songId,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: "Song already in playlist" },
        { status: 400 }
      );
    }

    // Get the highest order number
    const maxOrder = await prisma.playlistSong.findFirst({
      where: { playlistId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (maxOrder?.order ?? -1) + 1;

    // Add song to playlist
    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId: id,
        songId,
        order: nextOrder,
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

    const song = playlistSong.song as any;
    const lyricsRow = song?.lyrics?.[0];
    const lines = Array.isArray(lyricsRow?.lines) ? lyricsRow.lines : [];
    const responsePlaylistSong = {
      ...playlistSong,
      song: {
        ...song,
        lyrics: lines,
      },
    };

    return NextResponse.json(responsePlaylistSong, { status: 201 });
  } catch (error) {
    console.error("Error adding song to playlist:", error);
    return NextResponse.json(
      { error: "Failed to add song to playlist" },
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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");

    if (!songId) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (playlist.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove song from playlist
    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId: id,
          songId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing song from playlist:", error);
    return NextResponse.json(
      { error: "Failed to remove song from playlist" },
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

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");

    if (!songId) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { order } = body;

    if (typeof order !== "number") {
      return NextResponse.json(
        { error: "Order must be a number" },
        { status: 400 }
      );
    }

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (playlist.createdById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update song order in playlist
    await prisma.playlistSong.update({
      where: {
        playlistId_songId: {
          playlistId: id,
          songId,
        },
      },
      data: { order },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating song order:", error);
    return NextResponse.json(
      { error: "Failed to update song order" },
      { status: 500 }
    );
  }
}
