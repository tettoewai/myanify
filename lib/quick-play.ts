import { prisma, withRetry } from "@/db";
import { buildSongInclude } from "@/lib/song-query";

export const QUICK_PLAY_DEFAULT_LIMIT = 4;
export const QUICK_PLAY_MAX_LIMIT = 20;

export function parseQuickPlayLimit(value: string | null): number {
  const parsed = parseInt(value || String(QUICK_PLAY_DEFAULT_LIMIT), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return QUICK_PLAY_DEFAULT_LIMIT;
  }
  return Math.min(parsed, QUICK_PLAY_MAX_LIMIT);
}

export async function fetchQuickPlaySongs(limit = QUICK_PLAY_DEFAULT_LIMIT) {
  return withRetry(async () => {
    const songInclude = buildSongInclude(false);

    const songs = await prisma.song.findMany({
      where: { isPublished: true },
      include: songInclude,
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    return songs;
  });
}
