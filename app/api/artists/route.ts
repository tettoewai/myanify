import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { calculateMonthlyListenersByArtistIds } from "@/lib/monthly-listeners";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause with search support
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Execute count and data queries in parallel for better performance
    const [total, artists] = await Promise.all([
      prisma.artist.count({ where }),
      prisma.artist.findMany({
        where,
        include: {
          artistGenres: {
            include: {
              genre: true,
            },
          },
        },
        orderBy: { monthlyListeners: "desc" },
        take: limit,
        skip,
      }),
    ]);

    const listenerCounts = await calculateMonthlyListenersByArtistIds(
      artists.map((artist) => artist.id)
    );

    const artistsWithListenerCounts = artists.map((artist) => ({
      ...artist,
      monthlyListeners: Math.max(
        artist.monthlyListeners,
        listenerCounts.get(artist.id) ?? 0
      ),
    }));

    return NextResponse.json({
      data: artistsWithListenerCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, imageUrl, bio } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const artist = await prisma.artist.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        bio: bio || null,
      },
    });

    return NextResponse.json(artist, { status: 201 });
  } catch (error) {
    console.error("Error creating artist:", error);
    return NextResponse.json(
      { error: "Failed to create artist" },
      { status: 500 }
    );
  }
}
