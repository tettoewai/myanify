import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { formatSongsResponse, formatSongResponse } from "@/lib/song-response";
import { buildSongInclude } from "@/lib/song-query";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { calculateMonthlyListenersByArtistIds } from "@/lib/monthly-listeners";

const HOME_CACHE_TTL = 120; // 2 minutes for home feed

async function fetchHomeData(request: Request) {
  const songInclude = buildSongInclude(false);

  const [
    trendingSongs,
    newReleaseSongs,
    artists,
    albums,
    featuredPlaylists,
    genres,
  ] = await Promise.all([
    // Trending songs (by play count — same logic as quick-play)
    prisma.song.findMany({
      where: { isPublished: true },
      include: songInclude,
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    // New releases (newest published songs)
    prisma.song.findMany({
      where: { isPublished: true },
      include: songInclude,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // Popular artists by monthly listeners
    prisma.artist.findMany({
      include: {
        artistGenres: { include: { genre: true } },
      },
      orderBy: { monthlyListeners: "desc" },
      take: 10,
    }),
    // Featured albums — newest first (more useful than alphabetical)
    prisma.album.findMany({
      include: {
        _count: { select: { songs: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    // Public playlists — newest first
    prisma.playlist.findMany({
      where: { isPublic: true },
      include: {
        createdBy: { select: { id: true, name: true } },
        songs: {
          include: {
            song: {
              include: {
                artists: { include: { artist: true } },
                album: true,
              },
            },
          },
          orderBy: { order: "asc" },
          take: 4,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Genres
    prisma.genre.findMany({
      orderBy: { name: "asc" },
      take: 12,
    }),
  ]);

  // Enrich artists with live listener counts
  const listenerCounts = await calculateMonthlyListenersByArtistIds(
    artists.map((a) => a.id),
  );
  const enrichedArtists = artists.map((artist) => ({
    ...artist,
    monthlyListeners: Math.max(
      artist.monthlyListeners,
      listenerCounts.get(artist.id) ?? 0,
    ),
  }));

  const formattedTrending = formatSongsResponse(trendingSongs, request);
  const formattedNewReleases = formatSongsResponse(newReleaseSongs, request);

  return {
    featuredSong: formattedTrending[0] ?? null,
    trendingSongs: formattedTrending,
    newReleases: formattedNewReleases,
    popularArtists: enrichedArtists,
    featuredAlbums: albums,
    featuredPlaylists,
    genres,
  };
}

async function fetchRecentlyPlayed(userId: string, request: Request) {
  const playHistory = await prisma.playHistory.findMany({
    where: { userId },
    include: {
      song: {
        include: {
          artists: { include: { artist: true } },
          album: true,
          genre: true,
        },
      },
    },
    orderBy: { playedAt: "desc" },
    take: 60,
  });

  const seenIds = new Set<string>();
  const unique: ReturnType<typeof formatSongResponse>[] = [];

  for (const entry of playHistory) {
    if (seenIds.has(entry.songId)) continue;
    seenIds.add(entry.songId);

    const song = entry.song;
    const artistNames =
      song.artists
        ?.map((sa: any) => sa.artist?.name)
        .filter(Boolean)
        .join(", ") || "Unknown Artist";

    unique.push(
      formatSongResponse({ ...song, artist: artistNames }, request),
    );

    if (unique.length >= 6) break;
  }

  return unique;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    // Fetch public home data (cached)
    const homeData = await getCached(
      cacheKey("home:public"),
      () => fetchHomeData(request),
      HOME_CACHE_TTL,
    );

    // Fetch recently played if authenticated (not cached — personal data)
    let recentlyPlayed: any[] = [];
    if (session?.user?.id) {
      recentlyPlayed = await fetchRecentlyPlayed(session.user.id, request);
    }

    return NextResponse.json({
      ...homeData,
      recentlyPlayed,
    });
  } catch (error) {
    console.error("Error fetching home data:", error);
    return NextResponse.json(
      { error: "Failed to fetch home data" },
      { status: 500 },
    );
  }
}
