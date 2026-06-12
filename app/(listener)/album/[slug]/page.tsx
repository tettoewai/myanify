import { notFound } from "next/navigation";
import { SWRProvider } from "@/components/swr-provider";
import { getAlbumPageData } from "@/lib/page-data";
import { AlbumPageClient } from "./album-page-client";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getAlbumPageData(slug);

  if (!album) {
    notFound();
  }

  return (
    <SWRProvider fallback={{ [`/api/albums/${slug}`]: album }}>
      <AlbumPageClient slug={slug} />
    </SWRProvider>
  );
}
