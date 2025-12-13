import { Metadata } from "next";
import { prisma } from "@/db";
import { MusicArtistStructuredData } from "@/components/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      return {
        title: "Artist Not Found | Myanify",
        description: "The artist you are looking for could not be found.",
      };
    }

    const songCount = await prisma.song.count({
      where: { artistId: id, isPublished: true },
    });

    const title = `${artist.name} | Myanify - Myanmar Music Streaming`;
    const description = artist.bio
      ? `${artist.bio} Listen to ${songCount} ${songCount === 1 ? "song" : "songs"} by ${artist.name} on Myanify.`
      : `Listen to ${songCount} ${songCount === 1 ? "song" : "songs"} by ${artist.name} on Myanify - Myanmar Music Streaming Platform.`;

    const imageUrl = artist.imageUrl || "/placeholder.svg";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

    return {
      title,
      description,
      keywords: [
        artist.name,
        "Myanmar music",
        "Myanmar artist",
        "streaming",
        "Myanify",
      ],
      openGraph: {
        title,
        description,
        type: "profile",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${artist.name} - Artist Profile`,
          },
        ],
        siteName: "Myanify",
        url: `${siteUrl}/artist/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${siteUrl}/artist/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for artist:", error);
    return {
      title: "Artist | Myanify",
      description: "Discover Myanmar music artists on Myanify.",
    };
  }
}

export default async function ArtistLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

  let structuredData = null;
  try {
    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (artist) {
      const songCount = await prisma.song.count({
        where: { artistId: id, isPublished: true },
      });

      structuredData = (
        <MusicArtistStructuredData
          name={artist.name}
          image={artist.imageUrl || undefined}
          bio={artist.bio || undefined}
          url={`${siteUrl}/artist/${id}`}
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

