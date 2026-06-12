import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { prisma } from "@/db";
import {
  MusicAlbumStructuredData,
  StructuredData,
} from "@/components/structured-data";
import { findAlbumBySlugOrId } from "@/lib/entity-resolver";
import { entityPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildEntityMetadata,
  isSchemaMarkup,
  notFoundMetadata,
} from "@/lib/seo";
import { getAlbumSlugs, safeStaticParams } from "@/lib/seo-static";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return safeStaticParams(getAlbumSlugs);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;

  try {
    const result = await findAlbumBySlugOrId(param);
    if (!result) {
      return notFoundMetadata("Album");
    }

    const album = result.entity;
    const songCount = await prisma.song.count({
      where: { albumId: album.id, isPublished: true },
    });

    const title = `${album.name} - Myanmar Music`;
    const description = album.description
      ? `${album.description} Listen to ${songCount} ${songCount === 1 ? "song" : "songs"} on Myanify.`
      : `Listen to ${album.name} with ${songCount} ${songCount === 1 ? "song" : "songs"} on Myanify - Myanmar Music Streaming Platform.`;

    return buildEntityMetadata(album.seo, {
      title,
      description,
      keywords: [album.name, "Myanmar music", "album", "streaming", "Myanify"],
      imageUrl: album.coverUrl,
      entityType: "album",
      slug: album.slug,
      openGraphType: "music.album",
    });
  } catch (error) {
    console.error("Error generating metadata for album:", error);
    return {
      title: "Album",
      description: "Discover Myanmar music albums on Myanify.",
    };
  }
}

export default async function AlbumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: param } = await params;
  const siteUrl = getSiteUrl();

  const result = await findAlbumBySlugOrId(param);
  if (!result) {
    return <>{children}</>;
  }

  if (result.matchedBy === "id") {
    permanentRedirect(entityPath("album", result.entity.slug));
  }

  let structuredData = null;
  try {
    const album = result.entity;
    const songCount = await prisma.song.count({
      where: { albumId: album.id, isPublished: true },
    });
    const url = `${siteUrl}${entityPath("album", album.slug)}`;

    if (isSchemaMarkup(album.seo?.schemaMarkup)) {
      structuredData = <StructuredData data={album.seo.schemaMarkup} />;
    } else {
      structuredData = (
        <MusicAlbumStructuredData
          name={album.name}
          image={album.coverUrl || undefined}
          description={album.description || undefined}
          url={url}
          songCount={songCount}
          releaseDate={album.releaseDate?.toISOString()}
        />
      );
    }
  } catch (error) {
    console.error("Error generating structured data for album:", error);
  }

  return (
    <>
      {structuredData}
      {children}
    </>
  );
}
