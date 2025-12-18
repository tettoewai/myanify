import { prisma } from "@/db";

/**
 * Calculate monthly listeners for an artist
 * Counts unique users who played songs by this artist in the last 30 days
 */
export async function calculateMonthlyListeners(
  artistId: string
): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
    return 0;
  }

  const songIds = artistSongs.map((song) => song.id);

  // Count unique users who played any of these songs in the last 30 days
  const uniqueListeners = await prisma.playHistory.groupBy({
    by: ["userId"],
    where: {
      songId: { in: songIds },
      playedAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  return uniqueListeners.length;
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
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
      gte: thirtyDaysAgo,
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
