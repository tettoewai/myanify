"use client";

import { useEffect, useRef } from "react";
import type { Song } from "@/lib/types";
import { getSongCoverUrl } from "@/lib/utils";

const SEEK_OFFSET_SECONDS = 10;
const ARTWORK_SIZES = ["96x96", "128x128", "256x256", "512x512"] as const;

function getArtworkMimeType(url: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function buildArtwork(song: Song): MediaImage[] {
  const src = getSongCoverUrl(song);
  const type = getArtworkMimeType(src);
  return ARTWORK_SIZES.map((sizes) => ({ src, sizes, type }));
}

function buildMetadata(song: Song): MediaMetadata {
  return new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album || "Myanify",
    artwork: buildArtwork(song),
  });
}

interface UseMediaSessionOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
}

export function useMediaSession({
  song,
  isPlaying,
  currentTime,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
}: UseMediaSessionOptions) {
  const songRef = useRef(song);
  const currentTimeRef = useRef(currentTime);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onSeekRef = useRef(onSeek);

  songRef.current = song;
  currentTimeRef.current = currentTime;
  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  onSeekRef.current = onSeek;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const { mediaSession } = navigator;

    const setHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers reject unsupported actions
      }
    };

    setHandler("play", () => onPlayRef.current());
    setHandler("pause", () => onPauseRef.current());
    setHandler("previoustrack", () => onPrevRef.current());
    setHandler("nexttrack", () => onNextRef.current());
    setHandler("seekbackward", () => {
      onSeekRef.current(
        Math.max(0, currentTimeRef.current - SEEK_OFFSET_SECONDS),
      );
    });
    setHandler("seekforward", () => {
      const duration = songRef.current?.duration ?? 0;
      onSeekRef.current(
        Math.min(duration, currentTimeRef.current + SEEK_OFFSET_SECONDS),
      );
    });
    setHandler("seekto", (details: MediaSessionActionDetails) => {
      if (details.seekTime != null) {
        onSeekRef.current(details.seekTime);
      }
    });
    setHandler("stop", () => onPauseRef.current());

    return () => {
      setHandler("play", null);
      setHandler("pause", null);
      setHandler("previoustrack", null);
      setHandler("nexttrack", null);
      setHandler("seekbackward", null);
      setHandler("seekforward", null);
      setHandler("seekto", null);
      setHandler("stop", null);
      mediaSession.metadata = null;
      mediaSession.playbackState = "none";
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.metadata = song ? buildMetadata(song) : null;
  }, [
    song?.id,
    song?.title,
    song?.artist,
    song?.album,
    song?.albumCoverUrl,
    song?.coverUrl,
  ]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    if (!song) {
      navigator.mediaSession.playbackState = "none";
      return;
    }

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [song, isPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    if (!song?.duration || !("setPositionState" in navigator.mediaSession)) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: song.duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), song.duration),
      });
    } catch {
      // Invalid state while switching tracks
    }
  }, [song?.id, song?.duration, currentTime]);
}
