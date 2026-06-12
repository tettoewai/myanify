"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSongLyrics } from "@/lib/swr";
import type { LyricLine, Song } from "@/lib/types";

export function useLyricsLoader(song?: Song) {
  const [lyrics, setLyrics] = useState<LyricLine[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, LyricLine[]>>(new Map());

  useEffect(() => {
    setLyrics(undefined);
    setIsLoading(false);
  }, [song?.id]);

  const request = useCallback(() => {
    if (!song) return;
    const cached = cacheRef.current.get(song.id);
    if (cached !== undefined) {
      setLyrics(cached);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchSongLyrics(song.slug)
      .then((l) => {
        if (cancelled) return;
        cacheRef.current.set(song.id, l);
        setLyrics(l);
      })
      .catch(() => {
        if (cancelled) return;
        cacheRef.current.set(song.id, []);
        setLyrics([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [song?.id, song?.slug]);

  return { lyrics, isLoading, request };
}
