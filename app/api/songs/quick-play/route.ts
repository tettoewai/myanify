import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
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
import { getForYouSongs } from "@/lib/recommendations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseQuickPlayLimit(searchParams.get("limit"));
    const session = await getSession().catch(() => null);

    // Anonymous / cold-start: shared trending cache (as before).
    if (!session?.user?.id) {
      const payload = await getCached(
        cacheKeyFromRequest("songs:quick-play", request),
        async () => {
          const songs = await fetchQuickPlaySongs(limit);
          return {
            data: formatSongsResponse(songs, request),
            isPersonalized: false as const,
          };
        },
        CACHE_TTL.LIST,
      );
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_TTL.LIST}, stale-while-revalidate=${CACHE_TTL.LIST * 2}`,
        },
      });
    }

    // Signed-in: personal taste first, trending fallback inside the engine.
    const payload = await getCached(
      cacheKeyFromRequest(
        "recommendations:quick-play",
        request,
        `user=${session.user.id}`,
      ),
      async () => {
        const { songs, isPersonalized } = await getForYouSongs({
          userId: session.user.id,
          limit,
        });
        return {
          data: (formatSongsResponse(songs, request) as any[]).map((s, i) => ({
            ...s,
            _reason: (songs[i] as any)?._reason ?? null,
          })),
          isPersonalized,
        };
      },
      90,
    );

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    console.error("Error fetching quick play songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch quick play songs" },
      { status: 500 },
    );
  }
}
