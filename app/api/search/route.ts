import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { formatSongsResponse } from "@/lib/song-response";
import { buildSongIncludeFromRequest } from "@/lib/song-query";
import { calculateMonthlyListenersByArtistIds } from "@/lib/monthly-listeners";
import {
  buildArtistSearchWhere,
  buildSongSearchWhere,
  paginateItems,
  scoreArtistSearch,
  scoreSongSearch,
  sortBySearchScore,
} from "@/lib/search";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
} from "@/lib/cache";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q") || searchParams.get("search") || "";
  const rawPerPage = parseInt(
    searchParams.get("per_page") || searchParams.get("limit") || "20",
    10,
  );
  const perPage = Number.isFinite(rawPerPage)
    ? Math.min(100, Math.max(1, rawPerPage))
    : 20;

  if (!q.trim()) {
    return NextResponse.json({ songs: [], artists: [] });
  }

  try {
    const payload = await getCached(
      cacheKeyFromRequest("search:all", req),
      async () => {
        const songInclude = buildSongIncludeFromRequest(req);

        const [songs, artists] = await Promise.all([
          prisma.song.findMany({
            where: {
              isPublished: true,
              OR: buildSongSearchWhere(q),
            },
            include: songInclude,
          }),
          prisma.artist.findMany({
            where: { OR: buildArtistSearchWhere(q) },
            include: {
              artistGenres: { include: { genre: true } },
            },
          }),
        ]);

        const rankedSongs = paginateItems(
          sortBySearchScore(songs, q, scoreSongSearch, (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime(),
          ),
          1,
          perPage,
        );

        const listenerCounts = await calculateMonthlyListenersByArtistIds(
          artists.map((artist) => artist.id),
        );

        const artistsWithListenerCounts = artists.map((artist) => ({
          ...artist,
          monthlyListeners: Math.max(
            artist.monthlyListeners,
            listenerCounts.get(artist.id) ?? 0,
          ),
        }));

        const rankedArtists = paginateItems(
          sortBySearchScore(
            artistsWithListenerCounts,
            q,
            scoreArtistSearch,
            (left, right) => right.monthlyListeners - left.monthlyListeners,
          ),
          1,
          perPage,
        );

        return {
          songs: formatSongsResponse(rankedSongs, req),
          artists: rankedArtists,
        };
      },
      CACHE_TTL.SEARCH,
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { songs: [], artists: [], error: "Search failed" },
      { status: 500 },
    );
  }
}
