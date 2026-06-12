import { NextResponse } from "next/server";
import { formatSongsResponse } from "@/lib/song-response";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
} from "@/lib/cache";
import {
  fetchQuickPlaySongs,
  parseQuickPlayLimit,
} from "@/lib/quick-play";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseQuickPlayLimit(searchParams.get("limit"));

    const payload = await getCached(
      cacheKeyFromRequest("songs:quick-play", request),
      async () => {
        const songs = await fetchQuickPlaySongs(limit);
        return {
          data: formatSongsResponse(songs, request),
        };
      },
      CACHE_TTL.LIST,
    );

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL.LIST}, stale-while-revalidate=${CACHE_TTL.LIST * 2}`,
      },
    });
  } catch (error) {
    console.error("Error fetching quick play songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch quick play songs" },
      { status: 500 },
    );
  }
}
