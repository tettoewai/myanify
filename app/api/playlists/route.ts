import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const isPublic = searchParams.get("isPublic");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel for better performance
    const whereClause = {
      ...(userId && { createdById: userId }),
      ...(isPublic !== null && { isPublic: isPublic === "true" }),
    };

    const [total, playlists] = await Promise.all([
      prisma.playlist.count({ where: whereClause }),
      prisma.playlist.findMany({
        where: whereClause,
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
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
