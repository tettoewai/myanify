import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { formatSongsResponse } from "@/lib/song-response";
import { buildSongIncludeFromRequest } from "@/lib/song-query";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
} from "@/lib/cache";

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

    const payload = await getCached(
      cacheKeyFromRequest("similar", request),
      async () => {
        const limit = Math.min(
          parseInt(searchParams.get("limit") || "10", 10),
          25,
        );
        const excludeIds = (searchParams.get("excludeIds") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        const seed = await prisma.song.findUnique({
          where: { id: seedSongId },
          include: {
            artists: true,
          },
        });

        if (!seed || !seed.isPublished) {
          throw new Error("SONG_NOT_FOUND");
        }

        const seedArtistIds = seed.artists.map((a) => a.artistId);
        const excludeSet = new Set([seedSongId, ...excludeIds]);

        const candidateWhere: {
          isPublished: boolean;
          id: { notIn: string[] };
          OR?: Array<
            | { genreId: string | null }
            | { artists: { some: { artistId: { in: string[] } } } }
          >;
        } = {
          isPublished: true,
          id: { notIn: Array.from(excludeSet) },
        };

        const orClauses: (typeof candidateWhere)["OR"] = [];
        if (seed.genreId) {
          orClauses.push({ genreId: seed.genreId });
        }
        if (seedArtistIds.length > 0) {
          orClauses.push({
            artists: { some: { artistId: { in: seedArtistIds } } },
          });
        }

        if (orClauses.length === 0) {
          const fallback = await prisma.song.findMany({
            where: {
              isPublished: true,
              id: { notIn: Array.from(excludeSet) },
            },
            include: buildSongIncludeFromRequest(request),
            orderBy: { playCount: "desc" },
            take: limit,
          });
          return { data: formatSongsResponse(fallback, request) };
        }

        candidateWhere.OR = orClauses;

        const candidates = await prisma.song.findMany({
          where: candidateWhere,
          include: buildSongIncludeFromRequest(request),
          take: limit * 3,
        });

        const playCounts = candidates.map((s) => s.playCount);
        const median =
          playCounts.length > 0
            ? playCounts.sort((a, b) => a - b)[
                Math.floor(playCounts.length / 2)
              ]
            : 0;

        type Scored = (typeof candidates)[number] & { score: number };

        const scored: Scored[] = candidates.map((song) => {
          let score = 0;
          if (seed.genreId && song.genreId === seed.genreId) score += 2;
          const songArtistIds = song.artists.map((a) => a.artistId);
          const sharedArtists = songArtistIds.filter((id) =>
            seedArtistIds.includes(id),
          ).length;
          score += sharedArtists;
          if (song.playCount > median) score += 0.5;
          return { ...song, score };
        });

        const byTier = new Map<number, Scored[]>();
        for (const item of scored) {
          const tier = Math.floor(item.score);
          if (!byTier.has(tier)) byTier.set(tier, []);
          byTier.get(tier)!.push(item);
        }

        const tiers = Array.from(byTier.keys()).sort((a, b) => b - a);
        const result: Scored[] = [];
        for (const tier of tiers) {
          const bucket = shuffleInPlace([...(byTier.get(tier) || [])]);
          for (const song of bucket) {
            if (result.length >= limit) break;
            result.push(song);
          }
          if (result.length >= limit) break;
        }

        if (result.length < limit) {
          const moreExclude = new Set([
            ...excludeSet,
            ...result.map((s) => s.id),
          ]);
          const backfill = await prisma.song.findMany({
            where: {
              isPublished: true,
              id: { notIn: Array.from(moreExclude) },
            },
            include: buildSongIncludeFromRequest(request),
            orderBy: { playCount: "desc" },
            take: (limit - result.length) * 2,
          });
          const shuffled = shuffleInPlace(backfill);
          result.push(
            ...shuffled.slice(0, limit - result.length).map((song) => ({
              ...song,
              score: 0,
            })),
          );
        }

        return { data: formatSongsResponse(result, request) };
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
