"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/components/player-context";
import { useHomePlayerUrl } from "@/hooks/use-home-player-url";

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

export function useHomePlayerFromUrl() {
  const { isHome, params } = useHomePlayerUrl();
  const { playerOpen } = params;
  const {
    showNowPlaying,
    showFullscreenLyrics,
    setShowNowPlaying,
    setShowFullscreenLyrics,
    requestCurrentSongLyrics,
  } = usePlayer();

  const appliedPlayerRef = useRef<boolean | null>(null);
  const showNowPlayingRef = useRef(showNowPlaying);
  const showFullscreenLyricsRef = useRef(showFullscreenLyrics);
  showNowPlayingRef.current = showNowPlaying;
  showFullscreenLyricsRef.current = showFullscreenLyrics;

  useEffect(() => {
    if (!isHome) {
      appliedPlayerRef.current = null;
      return;
    }

    if (playerOpen === appliedPlayerRef.current) return;
    appliedPlayerRef.current = playerOpen;

    if (playerOpen) {
      requestCurrentSongLyrics();
      if (isMobileViewport()) {
        if (!showNowPlayingRef.current) setShowNowPlaying(true);
      } else if (!showFullscreenLyricsRef.current) {
        setShowFullscreenLyrics(true);
      }
      return;
    }

    if (showNowPlayingRef.current) setShowNowPlaying(false);
    if (showFullscreenLyricsRef.current) setShowFullscreenLyrics(false);
  }, [
    isHome,
    playerOpen,
    requestCurrentSongLyrics,
    setShowFullscreenLyrics,
    setShowNowPlaying,
  ]);
}
