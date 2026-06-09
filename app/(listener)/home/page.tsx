"use client";

import { Suspense, useEffect } from "react";
import { HomeView } from "@/components/views/home-view";
import { usePlayer } from "@/components/player-context";
import { AdBanner } from "@/components/ad-banner";
import { HomePageSkeleton } from "@/components/loading-skeletons";
import { useHomePlayerFromUrl } from "@/hooks/use-home-player-from-url";
import { useHomePlayerUrl } from "@/hooks/use-home-player-url";

function HomePageContent() {
  const { playSong, currentSong, isPlaying, isPremium } = usePlayer();
  const { params, setSongInUrl } = useHomePlayerUrl();

  useHomePlayerFromUrl();

  useEffect(() => {
    if (!currentSong?.slug || currentSong.slug === params.songSlug) return;
    setSongInUrl(currentSong.slug);
  }, [currentSong?.slug, params.songSlug, setSongInUrl]);

  return (
    <div className="min-h-full pb-32">
      <HomeView
        onPlaySong={playSong}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />
      {!isPremium && <AdBanner />}
    </div>
  );
}

export default function ListenerHomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageContent />
    </Suspense>
  );
}
