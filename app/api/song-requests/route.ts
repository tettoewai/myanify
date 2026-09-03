import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * POST /api/song-requests
 * Submit a new song request (authenticated users)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { songTitle, artistName, notes } = body;

    if (!songTitle?.trim() || !artistName?.trim()) {
      return NextResponse.json(
        { error: "Song title and artist name are required" },
        { status: 400 }
      );
    }

    const songRequest = await prisma.songRequest.create({
      data: {
        userId: session.user.id,
        songTitle: songTitle.trim(),
        artistName: artistName.trim(),
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(songRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating song request:", error);
    return NextResponse.json(
      { error: "Failed to create song request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/song-requests
 * Get current user's song requests
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const songRequests = await prisma.songRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: songRequests });
  } catch (error) {
    console.error("Error fetching song requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch song requests" },
      { status: 500 }
    );
  }
}
