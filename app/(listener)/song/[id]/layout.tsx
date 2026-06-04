import { Metadata } from "next";
import { prisma } from "@/db";
import { MusicSongStructuredData } from "@/components/structured-data";
import { getSiteUrl } from "@/lib/site-url";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `PT${mins}M${secs}S`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const song = await prisma.song.findUnique({
      where: { id, isPublished: true },
      include: {
        album: true,
        artists: {
          include: { artist: true },
        },
      },
    });

    if (!song) {
      return {
        title: "Song Not Found | Myanify",
        description: "The song you are looking for could not be found.",
      };
    }

    const artistNames =
      song.artists.map((sa) => sa.artist.name).join(", ") || "Unknown Artist";
    const title = `${song.title} - ${artistNames} | Myanify`;
    const description = `Listen to ${song.title} by ${artistNames}${
      song.album ? ` from ${song.album.name}` : ""
    } on Myanify - Myanmar Music Streaming Platform.`;

    const imageUrl =
      song.coverUrl || song.album?.coverUrl || "/placeholder.svg";
    const siteUrl = getSiteUrl();

    return {
      title,
      description,
      keywords: [
        song.title,
        artistNames,
        "Myanmar music",
        "streaming",
        "Myanify",
      ],
      openGraph: {
        title,
        description,
        type: "music.song",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${song.title} - Cover`,
          },
        ],
        siteName: "Myanify",
        url: `${siteUrl}/song/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${siteUrl}/song/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for song:", error);
    return {
      title: "Song | Myanify",
      description: "Discover Myanmar music on Myanify.",
    };
  }
}

export default async function SongLayout({
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
    const song = await prisma.song.findUnique({
      where: { id, isPublished: true },
      include: {
        album: true,
        artists: {
          include: { artist: true },
        },
      },
    });

    if (song) {
      const artistNames =
        song.artists.map((sa) => sa.artist.name).join(", ") || "Unknown Artist";

      structuredData = (
        <MusicSongStructuredData
          name={song.title}
          artist={artistNames}
          album={song.album?.name}
          duration={formatDuration(song.duration)}
          image={song.coverUrl || song.album?.coverUrl || undefined}
          url={`${siteUrl}/song/${id}`}
        />
      );
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
