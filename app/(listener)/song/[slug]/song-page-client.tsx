"use client";

import { SongView } from "@/components/views/song-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";
import { useSongPlayerFromUrl } from "@/hooks/use-song-player-from-url";

interface SongPageClientProps {
  slug: string;
}

export function SongPageClient({ slug }: SongPageClientProps) {
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
