"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/components/player-context";
import { useSong } from "@/lib/swr";
import { useHomePlayerUrl } from "@/hooks/use-home-player-url";

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

export function useHomePlayerFromUrl() {
  const { isHome, params } = useHomePlayerUrl();
  const { songSlug, playerOpen } = params;
  const { song: urlSong } = useSong(isHome && songSlug ? songSlug : null);
  const {
    playSong,
    currentSong,
    showNowPlaying,
    showFullscreenLyrics,
    setShowNowPlaying,
    setShowFullscreenLyrics,
    requestCurrentSongLyrics,
  } = usePlayer();

  const appliedSongRef = useRef<string | null>(null);
  const appliedPlayerRef = useRef<boolean | null>(null);
  const showNowPlayingRef = useRef(showNowPlaying);
  const showFullscreenLyricsRef = useRef(showFullscreenLyrics);
  showNowPlayingRef.current = showNowPlaying;
  showFullscreenLyricsRef.current = showFullscreenLyrics;

  useEffect(() => {
    if (!isHome) {
      appliedSongRef.current = null;
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

  useEffect(() => {
    if (!isHome || !songSlug || !urlSong) return;
    if (appliedSongRef.current === songSlug) return;
    if (currentSong?.slug === songSlug) {
      appliedSongRef.current = songSlug;
      return;
    }

    playSong(urlSong);
    appliedSongRef.current = songSlug;
  }, [isHome, songSlug, urlSong, currentSong?.slug, playSong]);

  useEffect(() => {
    if (!isHome || songSlug) return;
    appliedSongRef.current = null;
  }, [isHome, songSlug]);
}
