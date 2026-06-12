"use client";

import { ArtistView } from "@/components/views/artist-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

interface ArtistPageClientProps {
  slug: string;
}

export function ArtistPageClient({ slug }: ArtistPageClientProps) {
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
