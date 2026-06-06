import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { prisma } from "@/db";
import {
  MusicArtistStructuredData,
  StructuredData,
} from "@/components/structured-data";
import { findArtistBySlugOrId } from "@/lib/entity-resolver";
import { entityPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import {
  SEO_REVALIDATE_SECONDS,
  buildEntityMetadata,
  isSchemaMarkup,
  notFoundMetadata,
} from "@/lib/seo";
import { getArtistSlugs, safeStaticParams } from "@/lib/seo-static";

export const revalidate = SEO_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
  return safeStaticParams(getArtistSlugs);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: param } = await params;

  try {
    const result = await findArtistBySlugOrId(param);
    if (!result) {
      return notFoundMetadata("Artist");
    }

    const artist = result.entity;
    const songCount = await prisma.song.count({
      where: {
        artists: { some: { artistId: artist.id } },
        isPublished: true,
      },
    });

    const title = `${artist.name} - Myanmar Music Streaming`;
    const description = artist.bio
      ? `${artist.bio} Listen to ${songCount} ${songCount === 1 ? "song" : "songs"} by ${artist.name} on Myanify.`
      : `Listen to ${songCount} ${songCount === 1 ? "song" : "songs"} by ${artist.name} on Myanify - Myanmar Music Streaming Platform.`;

    return buildEntityMetadata(artist.seo, {
      title,
      description,
      keywords: [artist.name, "Myanmar music", "Myanmar artist", "streaming", "Myanify"],
      imageUrl: artist.imageUrl,
      entityType: "artist",
      slug: artist.slug,
      openGraphType: "profile",
    });
  } catch (error) {
    console.error("Error generating metadata for artist:", error);
    return {
      title: "Artist",
      description: "Discover Myanmar music artists on Myanify.",
    };
  }
}

export default async function ArtistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug: param } = await params;
  const siteUrl = getSiteUrl();

  const result = await findArtistBySlugOrId(param);
  if (!result) {
    return <>{children}</>;
  }

  if (result.matchedBy === "id") {
    permanentRedirect(entityPath("artist", result.entity.slug));
  }

  let structuredData = null;
  try {
    const artist = result.entity;
    const songCount = await prisma.song.count({
      where: {
        artists: { some: { artistId: artist.id } },
        isPublished: true,
      },
    });
    const url = `${siteUrl}${entityPath("artist", artist.slug)}`;

    if (isSchemaMarkup(artist.seo?.schemaMarkup)) {
      structuredData = <StructuredData data={artist.seo.schemaMarkup} />;
    } else {
      structuredData = (
        <MusicArtistStructuredData
          name={artist.name}
          image={artist.imageUrl || undefined}
          bio={artist.bio || undefined}
          url={url}
          songCount={songCount}
        />
      );
    }
  } catch (error) {
    console.error("Error generating structured data for artist:", error);
  }

  return (
    <>
      {structuredData}
      {children}
    </>
  );
}
