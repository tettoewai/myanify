"use client";

import { AlbumView } from "@/components/views/album-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

interface AlbumPageClientProps {
  slug: string;
}

export function AlbumPageClient({ slug }: AlbumPageClientProps) {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <AlbumView
        albumSlug={slug}
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
