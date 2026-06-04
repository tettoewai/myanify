import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { formatSongsResponse } from "@/lib/song-response";

const songInclude = {
  artists: { include: { artist: true } },
  album: true,
  genre: true,
  lyrics: { where: { language: "my" } },
} as const;

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
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10", 10),
      25,
    );
    const excludeIds = (searchParams.get("excludeIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!seedSongId) {
      return NextResponse.json(
        { error: "seedSongId is required" },
        { status: 400 },
      );
    }

    const seed = await prisma.song.findUnique({
      where: { id: seedSongId },
      include: {
        artists: true,
      },
    });

    if (!seed || !seed.isPublished) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
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
        include: songInclude,
        orderBy: { playCount: "desc" },
        take: limit,
      });
      return NextResponse.json({
        data: formatSongsResponse(fallback, request),
      });
    }

    candidateWhere.OR = orClauses;

    const candidates = await prisma.song.findMany({
      where: candidateWhere,
      include: songInclude,
      take: limit * 3,
    });

    const playCounts = candidates.map((s) => s.playCount);
    const median =
      playCounts.length > 0
        ? playCounts.sort((a, b) => a - b)[Math.floor(playCounts.length / 2)]
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
        include: songInclude,
        orderBy: { playCount: "desc" },
        take: (limit - result.length) * 2,
      });
      const shuffled = shuffleInPlace(backfill);
      result.push(...shuffled.slice(0, limit - result.length));
    }

    return NextResponse.json({
      data: formatSongsResponse(result, request),
    });
  } catch (error) {
    console.error("Error fetching similar songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch similar songs" },
      { status: 500 },
    );
  }
}
