"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/components/player-context";
import { useSong } from "@/lib/swr";

export function useSongPlayerFromUrl(slug: string) {
  const { song } = useSong(slug);
  const { playSong, currentSong } = usePlayer();
  const appliedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    appliedSlugRef.current = null;
  }, [slug]);

  useEffect(() => {
    if (!slug || !song) return;
    if (appliedSlugRef.current === slug) return;
    if (currentSong?.slug === slug) {
      appliedSlugRef.current = slug;
      return;
    }

    playSong(song);
    appliedSlugRef.current = slug;
  }, [slug, song, currentSong?.slug, playSong]);
}
