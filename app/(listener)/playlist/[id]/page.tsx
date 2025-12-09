"use client";

import { PlaylistView } from "@/components/views/playlist-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";

export const dynamic = "force-dynamic";

export default function PlaylistPage({ params }: { params: { id: string } }) {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <PlaylistView
        playlistId={params.id}
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}
