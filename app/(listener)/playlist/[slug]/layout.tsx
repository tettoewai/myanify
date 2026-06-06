import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { prisma } from "@/db";
import {
  MusicPlaylistStructuredData,
  StructuredData,
} from "@/components/structured-data";
import { findPlaylistBySlugOrId } from "@/lib/entity-resolver";
import { entityPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import {
  SEO_REVALIDATE_SECONDS,
  buildEntityMetadata,
  isSchemaMarkup,
  notFoundMetadata,
} from "@/lib/seo";
import { getPublicPlaylistSlugs, safeStaticParams } from "@/lib/seo-static";

export const revalidate = SEO_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
  return safeStaticParams(getPublicPlaylistSlugs);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;

  try {
    const result = await findPlaylistBySlugOrId(param);
    if (!result) {
      return notFoundMetadata("Playlist");
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: result.entity.id },
      include: {
        createdBy: { select: { name: true } },
        seo: true,
      },
    });

    if (!playlist) {
      return notFoundMetadata("Playlist");
    }

    const songCount = await prisma.playlistSong.count({
      where: {
        playlistId: playlist.id,
        song: { isPublished: true },
      },
    });

    const title = `${playlist.name} - Myanmar Music Playlist`;
    const description = playlist.description
      ? `${playlist.description} ${songCount} ${songCount === 1 ? "song" : "songs"}.`
      : `Listen to ${playlist.name} playlist with ${songCount} ${songCount === 1 ? "song" : "songs"} on Myanify - Myanmar Music Streaming Platform.`;

    return buildEntityMetadata(playlist.seo, {
      title,
      description,
      keywords: [
        playlist.name,
        "Myanmar music",
        "playlist",
        "streaming",
        "Myanify",
        playlist.createdBy?.name || "",
      ],
      imageUrl: playlist.coverUrl,
      entityType: "playlist",
      slug: playlist.slug,
      openGraphType: "music.playlist",
    });
  } catch (error) {
    console.error("Error generating metadata for playlist:", error);
    return {
      title: "Playlist",
      description: "Discover Myanmar music playlists on Myanify.",
    };
  }
}

export default async function PlaylistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: param } = await params;
  const siteUrl = getSiteUrl();

  const result = await findPlaylistBySlugOrId(param);
  if (!result) {
    return <>{children}</>;
  }

  if (result.matchedBy === "id") {
    permanentRedirect(entityPath("playlist", result.entity.slug));
  }

  let structuredData = null;
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id: result.entity.id },
      include: {
        createdBy: { select: { name: true } },
        seo: true,
      },
    });

    if (playlist) {
      const songCount = await prisma.playlistSong.count({
        where: {
          playlistId: playlist.id,
          song: { isPublished: true },
        },
      });
      const url = `${siteUrl}${entityPath("playlist", playlist.slug)}`;

      if (isSchemaMarkup(playlist.seo?.schemaMarkup)) {
        structuredData = <StructuredData data={playlist.seo.schemaMarkup} />;
      } else {
        structuredData = (
          <MusicPlaylistStructuredData
            name={playlist.name}
            description={playlist.description || undefined}
            image={playlist.coverUrl || undefined}
            url={url}
            songCount={songCount}
            creator={playlist.createdBy?.name || undefined}
          />
        );
      }
    }
  } catch (error) {
    console.error("Error generating structured data for playlist:", error);
  }

  return (
    <>
      {structuredData}
      {children}
    </>
  );
}
