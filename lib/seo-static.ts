import { prisma } from "@/db";
import { MAX_STATIC_PATHS } from "@/lib/seo";

export async function getPublishedSongSlugs() {
  return prisma.song.findMany({
    where: { isPublished: true },
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_STATIC_PATHS,
  });
}

export async function getArtistSlugs() {
  return prisma.artist.findMany({
    where: {
      songs: {
        some: {
          song: { isPublished: true },
        },
      },
    },
    select: { slug: true },
    orderBy: [{ monthlyListeners: "desc" }, { updatedAt: "desc" }],
    take: MAX_STATIC_PATHS,
  });
}

export async function getAlbumSlugs() {
  return prisma.album.findMany({
    where: {
      songs: {
        some: { isPublished: true },
      },
    },
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_STATIC_PATHS,
  });
}

export async function getGenreSlugs() {
  return prisma.genre.findMany({
    where: {
      songs: {
        some: { isPublished: true },
      },
    },
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_STATIC_PATHS,
  });
}

export async function getPublicPlaylistSlugs() {
  return prisma.playlist.findMany({
    where: {
      isPublic: true,
      songs: {
        some: {
          song: { isPublished: true },
        },
      },
    },
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_STATIC_PATHS,
  });
}

export async function safeStaticParams(
  fetcher: () => Promise<{ slug: string }[]>,
): Promise<{ slug: string }[]> {
  try {
    const items = await fetcher();
    return items.map(({ slug }) => ({ slug }));
  } catch (error) {
    console.error("Failed to generate static params:", error);
    return [];
  }
}
