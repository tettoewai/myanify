import { notFound } from "next/navigation";
import { SWRProvider } from "@/components/swr-provider";
import { getSongPageData } from "@/lib/page-data";
import { SongPageClient } from "./song-page-client";

export default async function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const song = await getSongPageData(slug);

  if (!song) {
    notFound();
  }

  // The song SWR hook fetches with ?include=lyrics, so we key the fallback
  // on that exact URL to hydrate the SWR cache correctly.
  return (
    <SWRProvider fallback={{ [`/api/songs/${slug}?include=lyrics`]: song }}>
      <SongPageClient slug={slug} />
    </SWRProvider>
  );
}
