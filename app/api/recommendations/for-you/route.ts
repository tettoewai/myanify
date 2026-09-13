import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { formatSongsResponse } from "@/lib/song-response";
import { getForYouSongs } from "@/lib/recommendations";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";

const FOR_YOU_TTL = 90; // short TTL — personal data, small catalog

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1),
      25,
    );
    const excludeIds = (searchParams.get("excludeIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const userId = session?.user?.id ?? "anonymous";
    const payload = await getCached(
      cacheKey(`recommendations:for-you:${userId}:limit=${limit}`, `ex=${excludeIds.join("|") || "_"}`),
      async () => {
        const { songs, profile, isPersonalized } = await getForYouSongs({
          userId: session?.user?.id,
          limit,
          excludeIds,
        });
        return {
          data: (formatSongsResponse(songs, request) as any[]).map((s, i) => ({
            ...s,
            _reason: (songs[i] as any)?._reason ?? null,
          })),
          isPersonalized,
          // Explainability for the UI ("Because you like Pop…")
          taste: profile.hasSignal
            ? {
                topGenres: profile.topGenres,
                topArtists: profile.topArtists,
                topMoods: profile.topMoods,
              }
            : null,
        };
      },
      session?.user?.id ? FOR_YOU_TTL : CACHE_TTL.LIST,
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching for-you recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}
