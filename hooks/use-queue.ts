"use client";

import {
  createQueueItem,
  reorderQueueItems,
  serializeUserUpNext,
  shuffleUpNext,
} from "@/lib/queue";
import type { QueueItem, QueueItemSource, Song } from "@/lib/types";
import { useCallback, useRef, useState } from "react";

const UP_NEXT_STORAGE_KEY = "myanify_up_next";

export function useQueue(initial: QueueItem[] = []) {
  const [upNext, setUpNext] = useState<QueueItem[]>(initial);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const baselineRef = useRef<QueueItem[]>(initial);
  const shuffleOrderRef = useRef<QueueItem[] | null>(null);

  const persistUserUpNext = useCallback((items: QueueItem[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        UP_NEXT_STORAGE_KEY,
        JSON.stringify(serializeUserUpNext(items)),
      );
    } catch (error) {
      console.error("Error saving up next:", error);
    }
  }, []);

  const applyUpNext = useCallback(
    (items: QueueItem[], isShuffled: boolean = false) => {
      setUpNext(items);
      baselineRef.current = items;
      if (!isShuffled) shuffleOrderRef.current = null;
      persistUserUpNext(items);
    },
    [persistUserUpNext],
  );

  const append = useCallback(
    (songs: Song[], source: QueueItemSource) => {
      setUpNext((prev) => {
        const items = songs.map((s) => createQueueItem(s, source));
        const next = [...prev, ...items];
        baselineRef.current = next;
        persistUserUpNext(next);
        return next;
      });
    },
    [persistUserUpNext],
  );

  const appendOne = useCallback(
    (song: Song, source: QueueItemSource) => {
      setUpNext((prev) => {
        const next = [...prev, createQueueItem(song, source)];
        baselineRef.current = next;
        persistUserUpNext(next);
        return next;
      });
    },
    [persistUserUpNext],
  );

  const prependOne = useCallback(
    (song: Song, source: QueueItemSource) => {
      setUpNext((prev) => {
        const next = [createQueueItem(song, source), ...prev];
        baselineRef.current = next;
        persistUserUpNext(next);
        return next;
      });
    },
    [persistUserUpNext],
  );

  const remove = useCallback(
    (qid: string) => {
      setUpNext((prev) => {
        const next = prev.filter((i) => i.qid !== qid);
        baselineRef.current = next;
        persistUserUpNext(next);
        return next;
      });
    },
    [persistUserUpNext],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setUpNext((prev) => {
        const next = reorderQueueItems(prev, fromIndex, toIndex);
        baselineRef.current = next;
        persistUserUpNext(next);
        return next;
      });
    },
    [persistUserUpNext],
  );

  const clear = useCallback(() => {
    setUpNext([]);
    baselineRef.current = [];
    shuffleOrderRef.current = null;
    persistUserUpNext([]);
  }, [persistUserUpNext]);

  const pushToHistory = useCallback(
    (song: Song, source: QueueItemSource, maxItems: number = 50) => {
      setHistory((prev) => {
        const item = createQueueItem(song, source);
        const next = [...prev, item];
        return next.length > maxItems ? next.slice(-maxItems) : next;
      });
    },
    [],
  );

  const removeFromHistory = useCallback((index: number) => {
    setHistory((prev) => prev.slice(0, index));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getActiveUpNext = useCallback(
    (isShuffled: boolean): QueueItem[] => {
      if (isShuffled && shuffleOrderRef.current) {
        return shuffleOrderRef.current;
      }
      return upNext;
    },
    [upNext],
  );

  const advanceQueue = useCallback(() => {
    setUpNext((prev) => {
      const next = prev.slice(1);
      baselineRef.current = next;
      persistUserUpNext(next);
      return next;
    });
  }, [persistUserUpNext]);

  const toggleShuffle = useCallback((enabled: boolean) => {
    if (enabled) {
      shuffleOrderRef.current = shuffleUpNext(baselineRef.current);
    } else {
      shuffleOrderRef.current = null;
      setUpNext(baselineRef.current);
    }
  }, []);

  return {
    upNext,
    history,
    applyUpNext,
    append,
    appendOne,
    prependOne,
    remove,
    reorder,
    clear,
    pushToHistory,
    removeFromHistory,
    clearHistory,
    getActiveUpNext,
    advanceQueue,
    toggleShuffle,
    baselineRef,
    shuffleOrderRef,
  } as const;
}
