import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { formatSongsResponse } from "@/lib/song-response";
import { getSimilarSongs } from "@/lib/recommendations";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
} from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seedSongId = searchParams.get("seedSongId");

    if (!seedSongId) {
      return NextResponse.json(
        { error: "seedSongId is required" },
        { status: 400 },
      );
    }

    // Personalize when the listener is signed in; anonymous still gets
    // content-based (genre / artist / album / mood / tags) results.
    const session = await getSession().catch(() => null);
    const userSuffix = session?.user?.id ? `:user=${session.user.id}` : ":anon";

    const payload = await getCached(
      `${cacheKeyFromRequest("similar", request)}${userSuffix}`,
      async () => {
        const limit = Math.min(
          parseInt(searchParams.get("limit") || "10", 10),
          25,
        );
        const excludeIds = (searchParams.get("excludeIds") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        const { songs } = await getSimilarSongs({
          seedSongId,
          userId: session?.user?.id,
          limit,
          excludeIds,
        });
        return {
          data: (formatSongsResponse(songs, request) as any[]).map((s, i) => ({
            ...s,
            _reason: (songs[i] as any)?._reason ?? null,
          })),
        };
      },
      CACHE_TTL.SIMILAR,
    );

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "SONG_NOT_FOUND") {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    console.error("Error fetching similar songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar songs" },
      { status: 500 },
    );
  }
}
