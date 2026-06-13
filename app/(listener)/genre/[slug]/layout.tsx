import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { prisma } from "@/db";
import {
  MusicGenreStructuredData,
  StructuredData,
} from "@/components/structured-data";
import { findGenreBySlugOrId } from "@/lib/entity-resolver";
import { entityPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildEntityMetadata,
  isSchemaMarkup,
  notFoundMetadata,
} from "@/lib/seo";
import { getGenreSlugs, safeStaticParams } from "@/lib/seo-static";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return safeStaticParams(getGenreSlugs);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;

  try {
    const result = await findGenreBySlugOrId(param);
    if (!result) {
      return notFoundMetadata("Genre");
    }

    const genre = result.entity;
    const songCount = await prisma.song.count({
      where: { genreId: genre.id, isPublished: true },
    });

    const title = `${genre.name} Music - Myanmar Music Streaming`;
    const description = genre.description
      ? `${genre.description} Discover ${songCount} ${songCount === 1 ? "song" : "songs"} in ${genre.name} genre on Myanify.`
      : `Discover ${songCount} ${songCount === 1 ? "song" : "songs"} in ${genre.name} genre on Myanify - Myanmar Music Streaming Platform.`;

    return buildEntityMetadata(genre.seo, {
      title,
      description,
      keywords: [
        genre.name,
        "Myanmar music",
        "genre",
        "streaming",
        "Myanify",
        `${genre.name} songs`,
      ],
      imageUrl: genre.imageUrl,
      entityType: "genre",
      slug: genre.slug,
      openGraphType: "website",
    });
  } catch (error) {
    console.error("Error generating metadata for genre:", error);
    return {
      title: "Genre",
      description: "Discover Myanmar music genres on Myanify.",
    };
  }
}

export default async function GenreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: param } = await params;
  const siteUrl = getSiteUrl();

  const result = await findGenreBySlugOrId(param);
  if (!result) {
    return <>{children}</>;
  }

  if (result.matchedBy === "id") {
    permanentRedirect(entityPath("genre", result.entity.slug));
  }

  let structuredData = null;
  try {
    const genre = result.entity;
    const songCount = await prisma.song.count({
      where: { genreId: genre.id, isPublished: true },
    });
    const url = `${siteUrl}${entityPath("genre", genre.slug)}`;

    if (isSchemaMarkup(genre.seo?.schemaMarkup)) {
      structuredData = <StructuredData data={genre.seo.schemaMarkup} />;
    } else {
      structuredData = (
        <MusicGenreStructuredData
          name={genre.name}
          description={genre.description || undefined}
          image={genre.imageUrl || undefined}
          url={url}
          songCount={songCount}
        />
      );
    }
  } catch (error) {
    console.error("Error generating structured data for genre:", error);
  }

  return (
    <>
      {structuredData}
      {children}
    </>
  );
}
