"use client";

import { use } from "react";
import { ArtistView } from "@/components/views/artist-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

export default function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <ArtistView
        artistSlug={slug}
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
