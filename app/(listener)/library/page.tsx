"use client";

import { LibraryView } from "@/components/views/library-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";


export default function LibraryPage() {
  const { playSong, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <LibraryView onPlaySong={playSong} />
      {!isPremium && <AdBanner />}
    </div>
  );
}
