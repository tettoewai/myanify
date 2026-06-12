"use client";

import { use } from "react";
import { SongView } from "@/components/views/song-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";
import { useSongPlayerFromUrl } from "@/hooks/use-song-player-from-url";

export default function SongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { currentSong, isPlaying, isPremium } = usePlayer();

  useSongPlayerFromUrl(slug);

  return (
    <div className="min-h-full pb-32">
      <SongView
        songSlug={slug}
        currentSongId={currentSong?.id ?? null}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
