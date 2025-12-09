import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [totalSongs, publishedSongs, totalArtists, totalGenres, totalPlays] =
      await Promise.all([
        prisma.song.count(),
        prisma.song.count({ where: { isPublished: true } }),
        prisma.artist.count(),
        prisma.genre.count(),
        prisma.song.aggregate({
          _sum: {
            playCount: true,
          },
        }),
      ]);

    return NextResponse.json({
      totalSongs,
      publishedSongs,
      totalArtists,
      totalGenres,
      totalPlays: totalPlays._sum.playCount || 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
