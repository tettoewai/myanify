import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_DYNAMIC_URLS_PER_TYPE = 1000;

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
          id: true,
          updatedAt: true,
        },
        orderBy: [{ monthlyListeners: "desc" }, { updatedAt: "desc" }],
        take: MAX_DYNAMIC_URLS_PER_TYPE,
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
          id: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_DYNAMIC_URLS_PER_TYPE,
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
          id: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_DYNAMIC_URLS_PER_TYPE,
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
          id: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_DYNAMIC_URLS_PER_TYPE,
      }),
      prisma.song.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: MAX_DYNAMIC_URLS_PER_TYPE,
      }),
    ]);

    return [
      ...staticRoutes,
      ...artists.map((artist) => ({
        url: absoluteUrl(siteUrl, `/artist/${artist.id}`),
        lastModified: artist.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...genres.map((genre) => ({
        url: absoluteUrl(siteUrl, `/genre/${genre.id}`),
        lastModified: genre.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...playlists.map((playlist) => ({
        url: absoluteUrl(siteUrl, `/playlist/${playlist.id}`),
        lastModified: playlist.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
      ...albums.map((album) => ({
        url: absoluteUrl(siteUrl, `/album/${album.id}`),
        lastModified: album.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
      ...songs.map((song) => ({
        url: absoluteUrl(siteUrl, `/song/${song.id}`),
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
