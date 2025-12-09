"use client";

import { ArtistView } from "@/components/views/artist-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

export const dynamic = "force-dynamic";

export default function ArtistPage({ params }: { params: { id: string } }) {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <ArtistView
        artistId={params.id}
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
