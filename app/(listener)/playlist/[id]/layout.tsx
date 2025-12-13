import { Metadata } from "next";
import { prisma } from "@/db";
import { MusicPlaylistStructuredData } from "@/components/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        songs: {
          where: {
            song: {
              isPublished: true,
            },
          },
          take: 1,
        },
      },
    });

    if (!playlist) {
      return {
        title: "Playlist Not Found | Myanify",
        description: "The playlist you are looking for could not be found.",
      };
    }

    const songCount = await prisma.playlistSong.count({
      where: {
        playlistId: id,
        song: {
          isPublished: true,
        },
      },
    });

    const title = `${playlist.name} | Myanify - Myanmar Music Playlist`;
    const description = playlist.description
      ? `${playlist.description} ${songCount} ${
          songCount === 1 ? "song" : "songs"
        }.`
      : `Listen to ${playlist.name} playlist with ${songCount} ${
          songCount === 1 ? "song" : "songs"
        } on Myanify - Myanmar Music Streaming Platform.`;

    const imageUrl = playlist.coverUrl || "/placeholder.svg";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

    return {
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
      openGraph: {
        title,
        description,
        type: "music.playlist",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${playlist.name} - Playlist Cover`,
          },
        ],
        siteName: "Myanify",
        url: `${siteUrl}/playlist/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${siteUrl}/playlist/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for playlist:", error);
    return {
      title: "Playlist | Myanify",
      description: "Discover Myanmar music playlists on Myanify.",
    };
  }
}

export default async function PlaylistLayout({
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
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (playlist) {
      const songCount = await prisma.playlistSong.count({
        where: {
          playlistId: id,
          song: {
            isPublished: true,
          },
        },
      });

      structuredData = (
        <MusicPlaylistStructuredData
          name={playlist.name}
          description={playlist.description || undefined}
          image={playlist.coverUrl || undefined}
          url={`${siteUrl}/playlist/${id}`}
          songCount={songCount}
          creator={playlist.createdBy?.name || undefined}
        />
      );
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
