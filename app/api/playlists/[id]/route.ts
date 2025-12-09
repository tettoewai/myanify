import { NextResponse } from "next/server";
import { prisma } from "@/db";

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
                artist: true,
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
