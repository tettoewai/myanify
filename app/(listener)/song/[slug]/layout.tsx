import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { prisma } from "@/db";
import {
  MusicSongStructuredData,
  StructuredData,
} from "@/components/structured-data";
import { findSongBySlugOrId } from "@/lib/entity-resolver";
import { entityPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildEntityMetadata,
  isSchemaMarkup,
  notFoundMetadata,
} from "@/lib/seo";
import { resolveSongCoverUrl } from "@/lib/utils";

export const revalidate = 3600;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `PT${mins}M${secs}S`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;

  try {
    const result = await findSongBySlugOrId(param, { publishedOnly: true });
    if (!result) {
      return notFoundMetadata("Song");
    }

    const song = await prisma.song.findUnique({
      where: { id: result.entity.id },
      include: {
        album: true,
        artists: { include: { artist: true } },
        seo: true,
      },
    });

    if (!song) {
      return notFoundMetadata("Song");
    }

    const artistNames =
      song.artists.map((sa) => sa.artist.name).join(", ") || "Unknown Artist";
    const title = `${song.title} - ${artistNames}`;
    const description = `Listen to ${song.title} by ${artistNames}${
      song.album ? ` from ${song.album.name}` : ""
    } on Myanify - Myanmar Music Streaming Platform.`;
    const artistImageUrl =
      song.artists.find((sa) => sa.artist.imageUrl)?.artist.imageUrl ?? null;
    const imageUrl = resolveSongCoverUrl({
      coverUrl: song.coverUrl,
      albumCoverUrl: song.album?.coverUrl,
      artistImageUrl,
    });

    return buildEntityMetadata(song.seo, {
      title,
      description,
      keywords: [
        song.title,
        artistNames,
        "Myanmar music",
        "streaming",
        "Myanify",
      ],
      imageUrl,
      entityType: "song",
      slug: song.slug,
      openGraphType: "music.song",
    });
  } catch (error) {
    console.error("Error generating metadata for song:", error);
    return {
      title: "Song",
      description: "Discover Myanmar music on Myanify.",
    };
  }
}

export default async function SongLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: param } = await params;
  const siteUrl = getSiteUrl();

  const result = await findSongBySlugOrId(param, { publishedOnly: true });
  if (!result) {
    return <>{children}</>;
  }

  if (result.matchedBy === "id") {
    permanentRedirect(entityPath("song", result.entity.slug));
  }

  let structuredData = null;
  try {
    const song = await prisma.song.findUnique({
      where: { id: result.entity.id, isPublished: true },
      include: {
        album: true,
        artists: { include: { artist: true } },
        seo: true,
      },
    });

    if (song) {
      const artistNames =
        song.artists.map((sa) => sa.artist.name).join(", ") || "Unknown Artist";
      const url = `${siteUrl}${entityPath("song", song.slug)}`;

      if (isSchemaMarkup(song.seo?.schemaMarkup)) {
        structuredData = <StructuredData data={song.seo.schemaMarkup} />;
      } else {
        structuredData = (
          <MusicSongStructuredData
            name={song.title}
            artist={artistNames}
            album={song.album?.name}
            duration={formatDuration(song.duration)}
            image={resolveSongCoverUrl({
              coverUrl: song.coverUrl,
              albumCoverUrl: song.album?.coverUrl,
              artistImageUrl:
                song.artists.find((sa) => sa.artist.imageUrl)?.artist
                  .imageUrl ?? null,
            })}
            url={url}
          />
        );
      }
    }
  } catch (error) {
    console.error("Error generating structured data for song:", error);
  }

  return (
    <>
      {structuredData}
      {children}
    </>
  );
}
