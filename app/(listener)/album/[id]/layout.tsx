import { Metadata } from "next";
import { prisma } from "@/db";
import { MusicAlbumStructuredData } from "@/components/structured-data";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        songs: {
          where: { isPublished: true },
          take: 1,
        },
      },
    });

    if (!album) {
      return {
        title: "Album Not Found | Myanify",
        description: "The album you are looking for could not be found.",
      };
    }

    const songCount = await prisma.song.count({
      where: { albumId: id, isPublished: true },
    });

    const title = `${album.name} | Myanify - Myanmar Music`;
    const description = album.description
      ? `${album.description} Listen to ${songCount} ${
          songCount === 1 ? "song" : "songs"
        } on Myanify.`
      : `Listen to ${album.name} with ${songCount} ${
          songCount === 1 ? "song" : "songs"
        } on Myanify - Myanmar Music Streaming Platform.`;

    const imageUrl = album.coverUrl || "/placeholder.svg";
    const siteUrl = getSiteUrl();

    return {
      title,
      description,
      keywords: [album.name, "Myanmar music", "album", "streaming", "Myanify"],
      openGraph: {
        title,
        description,
        type: "music.album",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${album.name} - Album Cover`,
          },
        ],
        siteName: "Myanify",
        url: `${siteUrl}/album/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${siteUrl}/album/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for album:", error);
    return {
      title: "Album | Myanify",
      description: "Discover Myanmar music albums on Myanify.",
    };
  }
}

export default async function AlbumLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const siteUrl = getSiteUrl();

  let structuredData = null;
  try {
    const album = await prisma.album.findUnique({
      where: { id },
    });

    if (album) {
      const songCount = await prisma.song.count({
        where: { albumId: id, isPublished: true },
      });

      structuredData = (
        <MusicAlbumStructuredData
          name={album.name}
          image={album.coverUrl || undefined}
          description={album.description || undefined}
          url={`${siteUrl}/album/${id}`}
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
