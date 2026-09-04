"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchSongLyrics } from "@/lib/swr";
import type { LyricLine, Song } from "@/lib/types";

type LyricsCacheEntry = {
  lyrics: LyricLine[];
  confirmed: boolean;
  fetchedAt: number;
};

const LYRICS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — empty results expire so admin edits can appear

function isCacheValid(entry: LyricsCacheEntry): boolean {
  // Non-empty is valid forever; empty expires after TTL
  if (entry.lyrics.length > 0) return entry.confirmed;
  return entry.confirmed && Date.now() - entry.fetchedAt < LYRICS_CACHE_TTL_MS;
}

function resolveEmbeddedLyrics(song: Song): LyricLine[] | null {
  if (!Array.isArray(song.lyrics) || song.lyrics.length === 0) return null;

  const first = song.lyrics[0] as unknown as {
    lines?: unknown;
    time?: number;
    text?: string;
  };

  // Guard malformed {lines:[]} object vs array
  if (first && typeof first === "object" && "lines" in first) {
    const linesField = (first as { lines?: unknown }).lines;
    if (Array.isArray(linesField)) {
      const lines = linesField.map((lyric: { time?: number; text?: string }) => ({
        time: lyric.time ?? 0,
        text: lyric.text ?? "",
      }));
      return lines.some((line) => line.text.trim()) ? lines : null;
    }
    return null;
  }

  const rawLines = song.lyrics as unknown as { time?: number; text?: string }[];

  if (!Array.isArray(rawLines)) return null;

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
    if (cached && isCacheValid(cached)) {
      applyCacheEntry(cached);
      return;
    }
    // Expired empty cache — evict so we can refetch
    if (cached && !isCacheValid(cached)) {
      cacheRef.current.delete(song.id);
    }

    const embedded = resolveEmbeddedLyrics(song);
    if (embedded) {
      const entry = { lyrics: embedded, confirmed: true, fetchedAt: Date.now() };
      cacheRef.current.set(song.id, entry);
      applyCacheEntry(entry);
      return;
    }

    // Also react to lyrics content change even if id same (revalidation)
    // If song.lyrics became defined after being undefined, treat as embedded
    if (song.lyrics !== undefined) {
      // Explicit empty array from API — cache as empty but with TTL
      const entry = { lyrics: [], confirmed: true, fetchedAt: Date.now() };
      cacheRef.current.set(song.id, entry);
      applyCacheEntry(entry);
      return;
    }

    setLyrics(undefined);
    if (inFlightSongIdRef.current !== song.id) {
      setIsLoading(false);
    }
  }, [song?.id, song?.slug, (song as unknown as { lyrics?: unknown })?.lyrics, applyCacheEntry]);

  const request = useCallback(() => {
    const current = songRef.current;
    if (!current) return;

    const cached = cacheRef.current.get(current.id);
    if (cached && isCacheValid(cached)) {
      applyCacheEntry(cached);
      return;
    }
    if (cached && !isCacheValid(cached)) cacheRef.current.delete(current.id);

    const embedded = resolveEmbeddedLyrics(current);
    if (embedded) {
      const entry = { lyrics: embedded, confirmed: true, fetchedAt: Date.now() };
      cacheRef.current.set(current.id, entry);
      applyCacheEntry(entry);
      return;
    }

    if (inFlightSongIdRef.current === current.id) return;

    inFlightSongIdRef.current = current.id;
    const requestId = current.id;
    setLyrics([]);
    setIsLoading(true);

    const controller = new AbortController();
    fetchSongLyrics(current.slug)
      .then((l) => {
        if (songRef.current?.id !== requestId) return;
        const entry = { lyrics: l, confirmed: true, fetchedAt: Date.now() };
        cacheRef.current.set(requestId, entry);
        setLyrics(l);
      })
      .catch((err) => {
        if (songRef.current?.id !== requestId) return;
        // Cache empty with TTL so we show "No lyrics" instead of infinite spinner, but allow retry
        const entry = { lyrics: [], confirmed: true, fetchedAt: Date.now() };
        cacheRef.current.set(requestId, entry);
        setLyrics([]);
        if (err instanceof TypeError) {
          toast.error("Couldn't load lyrics — check your connection.");
        } else {
          toast.error("Failed to load lyrics.");
        }
      })
      .finally(() => {
        if (inFlightSongIdRef.current === requestId) {
          inFlightSongIdRef.current = null;
        }
        if (songRef.current?.id === requestId) {
          setIsLoading(false);
        }
      });
    void controller;
  }, [applyCacheEntry]);

  return { lyrics, isLoading, request };
}
