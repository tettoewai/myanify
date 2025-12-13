import { Metadata } from "next";
import { prisma } from "@/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const genre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!genre) {
      return {
        title: "Genre Not Found | Myanify",
        description: "The genre you are looking for could not be found.",
      };
    }

    const songCount = await prisma.song.count({
      where: { genreId: id, isPublished: true },
    });

    const title = `${genre.name} Music | Myanify - Myanmar Music Streaming`;
    const description = genre.description
      ? `${genre.description} Discover ${songCount} ${songCount === 1 ? "song" : "songs"} in ${genre.name} genre on Myanify.`
      : `Discover ${songCount} ${songCount === 1 ? "song" : "songs"} in ${genre.name} genre on Myanify - Myanmar Music Streaming Platform.`;

    const imageUrl = genre.imageUrl || "/placeholder.svg";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

    return {
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
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: `${genre.name} - Music Genre`,
          },
        ],
        siteName: "Myanify",
        url: `${siteUrl}/genre/${id}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `${siteUrl}/genre/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for genre:", error);
    return {
      title: "Genre | Myanify",
      description: "Discover Myanmar music genres on Myanify.",
    };
  }
}

export default async function GenreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return <>{children}</>;
}

