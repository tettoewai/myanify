import type { MetadataRoute } from "next";
import { entityPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import { MAX_STATIC_PATHS } from "@/lib/seo";

export const revalidate = 3600;

function absoluteUrl(siteUrl: string, path = "/") {
  return `${siteUrl}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(siteUrl),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl(siteUrl, "/search"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    const { prisma } = await import("@/db");
    const [artists, genres, playlists, albums, songs] = await Promise.all([
      prisma.artist.findMany({
        where: {
          songs: {
            some: {
              song: {
                isPublished: true,
              },
            },
          },
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: [{ monthlyListeners: "desc" }, { updatedAt: "desc" }],
        take: MAX_STATIC_PATHS,
      }),
      prisma.genre.findMany({
        where: {
          songs: {
            some: {
              isPublished: true,
            },
          },
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_STATIC_PATHS,
      }),
      prisma.playlist.findMany({
        where: {
          isPublic: true,
          songs: {
            some: {
              song: {
                isPublished: true,
              },
            },
          },
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_STATIC_PATHS,
      }),
      prisma.album.findMany({
        where: {
          songs: {
            some: {
              isPublished: true,
            },
          },
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_STATIC_PATHS,
      }),
      prisma.song.findMany({
        where: { isPublished: true },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_STATIC_PATHS,
      }),
    ]);

    return [
      ...staticRoutes,
      ...artists.map((artist) => ({
        url: absoluteUrl(siteUrl, entityPath("artist", artist.slug)),
        lastModified: artist.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...genres.map((genre) => ({
        url: absoluteUrl(siteUrl, entityPath("genre", genre.slug)),
        lastModified: genre.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...playlists.map((playlist) => ({
        url: absoluteUrl(siteUrl, entityPath("playlist", playlist.slug)),
        lastModified: playlist.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...albums.map((album) => ({
        url: absoluteUrl(siteUrl, entityPath("album", album.slug)),
        lastModified: album.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...songs.map((song) => ({
        url: absoluteUrl(siteUrl, entityPath("song", song.slug)),
        lastModified: song.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("Error generating dynamic sitemap entries:", error);
    return staticRoutes;
  }
}
