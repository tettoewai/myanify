"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSongLyrics } from "@/lib/swr";
import type { LyricLine, Song } from "@/lib/types";

type LyricsCacheEntry = {
  lyrics: LyricLine[];
  confirmed: boolean;
};

function resolveEmbeddedLyrics(song: Song): LyricLine[] | null {
  if (!Array.isArray(song.lyrics) || song.lyrics.length === 0) return null;

  const first = song.lyrics[0] as {
    lines?: LyricLine[];
    time?: number;
    text?: string;
  };

  const rawLines = Array.isArray(first?.lines) ? first.lines : song.lyrics;

  const lines = rawLines.map((lyric: { time?: number; text?: string }) => ({
    time: lyric.time ?? 0,
    text: lyric.text ?? "",
  }));

  return lines.some((line) => line.text.trim()) ? lines : null;
}

export function useLyricsLoader(song?: Song) {
  const [lyrics, setLyrics] = useState<LyricLine[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, LyricsCacheEntry>>(new Map());
  const songRef = useRef(song);
  const inFlightSongIdRef = useRef<string | null>(null);
  const prevSongIdRef = useRef<string | undefined>(undefined);
  songRef.current = song;

  const applyCacheEntry = useCallback((entry: LyricsCacheEntry) => {
    setLyrics(entry.lyrics);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (prevSongIdRef.current !== song?.id) {
      inFlightSongIdRef.current = null;
      prevSongIdRef.current = song?.id;
    }

    if (!song) {
      setLyrics(undefined);
      setIsLoading(false);
      return;
    }

    const cached = cacheRef.current.get(song.id);
    if (cached?.confirmed) {
      applyCacheEntry(cached);
      return;
    }

    const embedded = resolveEmbeddedLyrics(song);
    if (embedded) {
      const entry = { lyrics: embedded, confirmed: true };
      cacheRef.current.set(song.id, entry);
      applyCacheEntry(entry);
      return;
    }

    setLyrics(undefined);
    if (inFlightSongIdRef.current !== song.id) {
      setIsLoading(false);
    }
  }, [song?.id, song?.slug, applyCacheEntry]);

  const request = useCallback(() => {
    const current = songRef.current;
    if (!current) return;

    const cached = cacheRef.current.get(current.id);
    if (cached?.confirmed) {
      applyCacheEntry(cached);
      return;
    }

    const embedded = resolveEmbeddedLyrics(current);
    if (embedded) {
      const entry = { lyrics: embedded, confirmed: true };
      cacheRef.current.set(current.id, entry);
      applyCacheEntry(entry);
      return;
    }

    if (inFlightSongIdRef.current === current.id) return;

    inFlightSongIdRef.current = current.id;
    setLyrics(undefined);
    setIsLoading(true);

    fetchSongLyrics(current.slug)
      .then((l) => {
        if (songRef.current?.id !== current.id) return;
        const entry = { lyrics: l, confirmed: true };
        cacheRef.current.set(current.id, entry);
        setLyrics(l);
      })
      .catch(() => {
        if (songRef.current?.id !== current.id) return;
        setLyrics(undefined);
      })
      .finally(() => {
        if (inFlightSongIdRef.current === current.id) {
          inFlightSongIdRef.current = null;
        }
        if (songRef.current?.id === current.id) {
          setIsLoading(false);
        }
      });
  }, [applyCacheEntry]);

  return { lyrics, isLoading, request };
}
