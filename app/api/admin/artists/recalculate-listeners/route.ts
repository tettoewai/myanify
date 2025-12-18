import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  recalculateAllMonthlyListeners,
  recalculateArtistMonthlyListeners,
} from "@/lib/monthly-listeners";

/**
 * POST /api/admin/artists/recalculate-listeners
 * Recalculate monthly listeners for all artists or a specific artist
 * Admin only
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { artistId } = body;

    if (artistId) {
      // Recalculate for a specific artist
      const count = await recalculateArtistMonthlyListeners(artistId);
      return NextResponse.json({
        success: true,
        artistId,
        monthlyListeners: count,
      });
    } else {
      // Recalculate for all artists
      await recalculateAllMonthlyListeners();
      return NextResponse.json({
        success: true,
        message: "Monthly listeners recalculated for all artists",
      });
    }
  } catch (error) {
    console.error("Error recalculating monthly listeners:", error);
    return NextResponse.json(
      { error: "Failed to recalculate monthly listeners" },
      { status: 500 }
    );
  }
}
