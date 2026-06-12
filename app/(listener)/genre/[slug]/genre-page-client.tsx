"use client";

import { GenreView } from "@/components/views/genre-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

interface GenrePageClientProps {
  slug: string;
}

export function GenrePageClient({ slug }: GenrePageClientProps) {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <GenreView
        genreSlug={slug}
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
