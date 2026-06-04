"use client";

import { Suspense } from "react";
import { SearchView } from "@/components/views/search-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";
import { SearchPageSkeleton } from "@/components/loading-skeletons";

export const dynamic = "force-dynamic";

function SearchPageContent() {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();

  return (
    <div className="min-h-full pb-32">
      <SearchView
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={<SearchPageSkeleton />}
    >
      <SearchPageContent />
    </Suspense>
  );
}
