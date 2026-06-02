import { prisma } from "@/db";

function getThirtyDaysAgo(): Date {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return thirtyDaysAgo;
}

/**
 * Calculate monthly listeners for multiple artists.
 * Counts unique users who played songs by each artist in the last 30 days.
 */
export async function calculateMonthlyListenersByArtistIds(
  artistIds: string[]
): Promise<Map<string, number>> {
  const uniqueArtistIds = [...new Set(artistIds.filter(Boolean))];
  const listenerCounts = new Map<string, number>(
    uniqueArtistIds.map((artistId) => [artistId, 0])
  );

  if (uniqueArtistIds.length === 0) {
    return listenerCounts;
  }

  const recentPlays = await prisma.playHistory.findMany({
    where: {
      playedAt: {
        gte: getThirtyDaysAgo(),
      },
      song: {
        artists: {
          some: {
            artistId: { in: uniqueArtistIds },
          },
        },
      },
    },
    select: {
      userId: true,
      song: {
        select: {
          artists: {
            where: {
              artistId: { in: uniqueArtistIds },
            },
            select: {
              artistId: true,
            },
          },
        },
      },
    },
  });

  const listenersByArtist = new Map<string, Set<string>>(
    uniqueArtistIds.map((artistId) => [artistId, new Set<string>()])
  );

  for (const play of recentPlays) {
    for (const songArtist of play.song.artists) {
      listenersByArtist.get(songArtist.artistId)?.add(play.userId);
    }
  }

  for (const [artistId, listeners] of listenersByArtist) {
    listenerCounts.set(artistId, listeners.size);
  }

  return listenerCounts;
}

/**
 * Calculate monthly listeners for an artist
 * Counts unique users who played songs by this artist in the last 30 days
 */
export async function calculateMonthlyListeners(
  artistId: string
): Promise<number> {
  const listenerCounts = await calculateMonthlyListenersByArtistIds([artistId]);
  return listenerCounts.get(artistId) ?? 0;
}

/**
 * Update monthly listeners count for an artist
 * This should be called when a song is played to check if we need to increment
 * @param artistId - The artist ID
 * @param userId - The user ID who played the song
 * @param excludePlayHistoryId - Optional play history ID to exclude from the check (the current play)
 */
export async function updateMonthlyListenersForPlay(
  artistId: string,
  userId: string,
  excludePlayHistoryId?: string
): Promise<void> {
  // Get all songs by this artist (using many-to-many relationship)
  const artistSongs = await prisma.song.findMany({
    where: {
      artists: {
        some: {
          artistId: artistId,
        },
      },
    },
    select: { id: true },
  });

  if (artistSongs.length === 0) {
    return;
  }

  const songIds = artistSongs.map((song) => song.id);

  // Check if this user has played any OTHER song by this artist in the last 30 days
  // (excluding the current play if provided)
  const whereClause: any = {
    userId,
    songId: { in: songIds },
    playedAt: {
      gte: getThirtyDaysAgo(),
    },
  };

  if (excludePlayHistoryId) {
    whereClause.id = { not: excludePlayHistoryId };
  }

  const previousPlay = await prisma.playHistory.findFirst({
    where: whereClause,
    orderBy: {
      playedAt: "desc",
    },
  });

  // If this is a new listener (no previous play in last 30 days), increment monthly listeners
  if (!previousPlay) {
    await prisma.artist.update({
      where: { id: artistId },
      data: {
        monthlyListeners: { increment: 1 },
      },
    });
  }
}

/**
 * Recalculate monthly listeners for all artists
 * Useful for periodic updates or fixing discrepancies
 */
export async function recalculateAllMonthlyListeners(): Promise<void> {
  const artists = await prisma.artist.findMany({
    select: { id: true },
  });

  for (const artist of artists) {
    const count = await calculateMonthlyListeners(artist.id);
    await prisma.artist.update({
      where: { id: artist.id },
      data: {
        monthlyListeners: count,
      },
    });
  }
}

/**
 * Recalculate monthly listeners for a specific artist
 */
export async function recalculateArtistMonthlyListeners(
  artistId: string
): Promise<number> {
  const count = await calculateMonthlyListeners(artistId);
  await prisma.artist.update({
    where: { id: artistId },
    data: {
      monthlyListeners: count,
    },
  });
  return count;
}
