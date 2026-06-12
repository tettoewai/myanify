import { notFound } from "next/navigation";
import { SWRProvider } from "@/components/swr-provider";
import { getArtistPageData } from "@/lib/page-data";
import { ArtistPageClient } from "./artist-page-client";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getArtistPageData(slug);

  if (!artist) {
    notFound();
  }

  return (
    <SWRProvider fallback={{ [`/api/artists/${slug}`]: artist }}>
      <ArtistPageClient slug={slug} />
    </SWRProvider>
  );
}
