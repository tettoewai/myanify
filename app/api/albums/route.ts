import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { isAlbumType } from "@/lib/album-type";

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
    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: albums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
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
    const { name, coverUrl, description, releaseDate, type } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (type !== undefined && !isAlbumType(type)) {
      return NextResponse.json({ error: "Invalid album type" }, { status: 400 });
    }

    const album = await prisma.album.create({
      data: {
        name,
        type: type && isAlbumType(type) ? type : "ALBUM",
        coverUrl: coverUrl || null,
        description: description || null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
      },
    });

    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    console.error("Error creating album:", error);
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
