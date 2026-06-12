import { notFound } from "next/navigation";
import { SWRProvider } from "@/components/swr-provider";
import { getGenrePageData } from "@/lib/page-data";
import { GenrePageClient } from "./genre-page-client";

export default async function GenrePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const genre = await getGenrePageData(slug);

  if (!genre) {
    notFound();
  }

  return (
    <SWRProvider fallback={{ [`/api/genres/${slug}`]: genre }}>
      <GenrePageClient slug={slug} />
    </SWRProvider>
  );
}
