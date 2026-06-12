"use client";

import { useCallback, useRef, useState } from "react";
import { transformSong } from "@/lib/data-transform";
import { pickAutoplaySongs } from "@/lib/queue";
import { parseApiErrorBody, notifyRateLimitError } from "@/lib/api-client";
import type { Song } from "@/lib/types";
import { RADIO_BATCH_SIZE } from "@/lib/queue";

export function useRadioFetch() {
  const [isFetching, setIsFetching] = useState(false);
  const retryAtRef = useRef(0);

  const fetchSimilarSongs = useCallback(
    async (
      seedId: string,
      excludeIds: Set<string>,
      recentlyPlayedSongs: Song[] = [],
      allSongs: Song[] = [],
    ): Promise<{ songs: Song[]; source: "radio" | "autoplay" }> => {
      if (Date.now() < retryAtRef.current)
        return { songs: [], source: "radio" };
      setIsFetching(true);
      try {
        const exclude = Array.from(excludeIds).join(",");
        const res = await fetch(
          `/api/songs/similar?seedSongId=${encodeURIComponent(
            seedId,
          )}&excludeIds=${encodeURIComponent(exclude)}&limit=${RADIO_BATCH_SIZE}`,
        );
        if (!res.ok) {
          if (res.status === 429) {
            const { retryAfterSeconds } = await parseApiErrorBody(res);
            notifyRateLimitError(retryAfterSeconds);
          }
          throw new Error("Similar songs fetch failed");
        }
        const json = await res.json();
        const raw = json.data || [];
        let newSongs: Song[] = raw.map(transformSong);
        if (newSongs.length === 0) {
          const fallback = pickAutoplaySongs(
            allSongs,
            recentlyPlayedSongs,
            excludeIds,
            seedId,
            RADIO_BATCH_SIZE,
          );
          return { songs: fallback, source: "autoplay" };
        }
        return { songs: newSongs, source: "radio" };
      } catch (error) {
        console.error("Radio fetch error:", error);
        retryAtRef.current = Date.now() + 30_000;
        const fallback = pickAutoplaySongs(
          allSongs,
          recentlyPlayedSongs,
          excludeIds,
          seedId,
          RADIO_BATCH_SIZE,
        );
        return { songs: fallback, source: "autoplay" };
      } finally {
        setIsFetching(false);
      }
    },
    [],
  );

  return { isFetching, fetchSimilarSongs };
}
