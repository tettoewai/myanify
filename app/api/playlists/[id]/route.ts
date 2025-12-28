import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playlist = await prisma.playlist.findUnique({
      where: { id },
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
                genre: true,
                lyrics: {
                  orderBy: { time: "asc" },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!playlist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(playlist);
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, coverUrl, isPublic } = body;

    // Check if playlist exists and user owns it
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (existingPlaylist.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const playlist = await prisma.playlist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(isPublic !== undefined && { isPublic }),
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
                genre: true,
                lyrics: {
                  orderBy: { time: "asc" },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(playlist);
  } catch (error) {
    console.error("Error updating playlist:", error);
    return NextResponse.json(
      { error: "Failed to update playlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if playlist exists and user owns it
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existingPlaylist) {
      return NextResponse.json(
        { error: "Playlist not found" },
        { status: 404 }
      );
    }

    if (existingPlaylist.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.playlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    return NextResponse.json(
      { error: "Failed to delete playlist" },
      { status: 500 }
    );
  }
}
