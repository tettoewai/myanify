"use client";

import { PlaylistView } from "@/components/views/playlist-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

interface PlaylistPageClientProps {
  slug: string;
}

export function PlaylistPageClient({ slug }: PlaylistPageClientProps) {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <PlaylistView
        playlistSlug={slug}
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
