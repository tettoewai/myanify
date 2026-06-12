"use client";

import { useEffect, useRef, useCallback } from "react";

interface AudioEngineCallbacks {
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onError?: () => void;
}

export function useAudioEngine(callbacks?: AudioEngineCallbacks) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    preloadRef.current = new Audio();
    preloadRef.current.preload = "auto";

    const handleTimeUpdate = () => {
      if (audioRef.current && callbacks?.onTimeUpdate) {
        callbacks.onTimeUpdate(Math.floor(audioRef.current.currentTime));
      }
    };

    const handleEnded = () => {
      if (callbacks?.onEnded) {
        callbacks.onEnded();
      }
    };

    const handleError = () => {
      if (callbacks?.onError) {
        callbacks.onError();
      }
    };

    const audio = audioRef.current;
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.src = "";
      preloadRef.current?.pause();
      if (preloadRef.current) preloadRef.current.src = "";
    };
  }, [callbacks]);

  const setVolume = useCallback((volume: number, muted: boolean) => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume / 100;
    }
  }, []);

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error("Error playing audio:", error);
      }
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const setSrc = useCallback((src: string) => {
    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.load();
    }
  }, []);

  return {
    audioRef,
    preloadRef,
    setVolume,
    play,
    pause,
    setSrc,
  } as const;
}
