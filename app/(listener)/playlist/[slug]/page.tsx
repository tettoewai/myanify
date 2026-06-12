import { notFound } from "next/navigation";
import { SWRProvider } from "@/components/swr-provider";
import { getPlaylistPageData } from "@/lib/page-data";
import { PlaylistPageClient } from "./playlist-page-client";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const playlist = await getPlaylistPageData(slug);

  if (!playlist) {
    notFound();
  }

  return (
    <SWRProvider fallback={{ [`/api/playlists/${slug}`]: playlist }}>
      <PlaylistPageClient slug={slug} />
    </SWRProvider>
  );
}
