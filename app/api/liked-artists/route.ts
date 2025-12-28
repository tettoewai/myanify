import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

// GET - Fetch user's liked artists
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const likedArtists = await prisma.likedArtist.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        artist: {
          include: {
            artistGenres: {
              include: {
                genre: true,
              },
            },
            _count: {
              select: {
                songs: true,
              },
            },
          },
        },
      },
      orderBy: {
        likedAt: "desc",
      },
    });

    // Transform to return artists with liked metadata
    const artists = likedArtists.map((entry) => ({
      ...entry.artist,
      likedAt: entry.likedAt,
    }));

    return NextResponse.json({ data: artists });
  } catch (error) {
    console.error("Error fetching liked artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked artists" },
      { status: 500 }
    );
  }
}

// POST - Like an artist
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { artistId } = body;

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId is required" },
        { status: 400 }
      );
    }

    // Verify artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Check if already liked
    const existingLike = await prisma.likedArtist.findUnique({
      where: {
        userId_artistId: {
          userId: session.user.id,
          artistId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json(
        { error: "Artist already liked" },
        { status: 409 }
      );
    }

    // Create liked artist entry
    const likedArtist = await prisma.likedArtist.create({
      data: {
        userId: session.user.id,
        artistId,
      },
      include: {
        artist: {
          include: {
            artistGenres: {
              include: {
                genre: true,
              },
            },
            _count: {
              select: {
                songs: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(likedArtist, { status: 201 });
  } catch (error) {
    console.error("Error liking artist:", error);
    return NextResponse.json({ error: "Failed to like artist" }, { status: 500 });
  }
}

// DELETE - Unlike an artist
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (!artistId) {
      return NextResponse.json(
        { error: "artistId is required" },
        { status: 400 }
      );
    }

    // Delete liked artist entry
    await prisma.likedArtist.delete({
      where: {
        userId_artistId: {
          userId: session.user.id,
          artistId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking artist:", error);
    return NextResponse.json(
      { error: "Failed to unlike artist" },
      { status: 500 }
    );
  }
}