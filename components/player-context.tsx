"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { QueueItem, QueueItemSource, Song, LyricLine } from "@/lib/types";
import { requireLoginRedirect } from "@/lib/require-login";
import { useMediaSession } from "@/hooks/use-media-session";
import {
  notifyRateLimitError,
  parseApiErrorBody,
  swrFetcher,
} from "@/lib/api-client";
import { useSongs, usePlayHistory, fetchSongLyrics } from "@/lib/swr";
import { transformSong } from "@/lib/data-transform";
import {
  createQueueItem,
  createQueueItems,
  MAX_PLAY_HISTORY,
  RADIO_BATCH_SIZE,
  RADIO_REFETCH_THRESHOLD,
  pickAutoplaySongs,
  reorderQueueItems,
  restoreUserUpNext,
  serializeUserUpNext,
  shuffleUpNext,
  UP_NEXT_STORAGE_KEY,
  type PersistedQueueEntry,
} from "@/lib/queue";

export interface PlaySongOptions {
  source?: QueueItemSource;
  upNext?: Song[];
  enableRadio?: boolean;
  skipAuth?: boolean;
}

interface PlayerContextType {
  currentSong: Song | null;
  currentSongLyrics: LyricLine[] | undefined;
  isLoadingLyrics: boolean;
  isPlaying: boolean;
  currentTime: number;
  queue: Song[];
  upNext: QueueItem[];
  history: QueueItem[];
  isPremium: boolean;
  showLyrics: boolean;
  showFullscreenLyrics: boolean;
  showNowPlaying: boolean;
  showQueue: boolean;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: "off" | "all" | "one";
  radioMode: boolean;
  radioSeedSongId: string | null;
  isFetchingRadio: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setQueue: (songs: Song[]) => void;
  setIsPremium: (premium: boolean) => void;
  setShowLyrics: (show: boolean) => void;
  setShowFullscreenLyrics: (show: boolean) => void;
  setShowNowPlaying: (show: boolean) => void;
  requestCurrentSongLyrics: () => void;
  setShowQueue: (show: boolean) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsShuffled: (shuffled: boolean) => void;
  setRepeatMode: (mode: "off" | "all" | "one") => void;
  setRadioMode: (enabled: boolean) => void;
  playSong: (song: Song, options?: PlaySongOptions) => void;
  playFromContext: (
    song: Song,
    contextSongs: Song[],
    source?: QueueItemSource,
  ) => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (qid: string) => void;
  reorderUpNext: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  startRadio: (seedSong: Song) => void;
  isSongQueued: (songId: string) => boolean;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  upgradePremium: () => void;
  getRecentlyPlayed: () => Song[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const LAST_PLAYED_SONG_KEY = "myanify_last_played_song";
const LAST_PLAYBACK_POSITION_KEY = "myanify_last_playback_position";
const MAX_RECENTLY_PLAYED = 50;
const POSITION_SAVE_INTERVAL = 5000;
const PRELOAD_SECONDS_BEFORE_END = 20;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentSongLyrics, setCurrentSongLyrics] = useState<
    LyricLine[] | undefined
  >(undefined);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsCacheRef = useRef<Map<string, LyricLine[]>>(new Map());
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [upNext, setUpNext] = useState<QueueItem[]>([]);
  const upNextRef = useRef<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [lyricsRequested, setLyricsRequested] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [radioMode, setRadioMode] = useState(false);
  const [radioSeedSongId, setRadioSeedSongId] = useState<string | null>(null);
  const [isFetchingRadio, setIsFetchingRadio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const nextSongRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef(false);
  const restorePositionRef = useRef<number | null>(null);
  const positionSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  const isChangingSongRef = useRef(false);
  const seenSongIdsRef = useRef<Set<string>>(new Set());
  const radioRetryAtRef = useRef(0);
  const shuffleOrderRef = useRef<QueueItem[] | null>(null);
  const upNextBaselineRef = useRef<QueueItem[]>([]);
  const hasRestoredUpNextRef = useRef(false);
  const preloadedQidRef = useRef<string | null>(null);
  const userDisabledRadioRef = useRef(false);
  const loadedSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    upNextRef.current = upNext;
  }, [upNext]);

  const { songs } = useSongs({ isPublished: true });
  const songsById = useMemo(
    () => new Map(songs.map((s) => [s.id, s])),
    [songs],
  );

  const { songs: recentlyPlayedSongs, mutate: mutatePlayHistory } =
    usePlayHistory({
      limit: MAX_RECENTLY_PLAYED,
      enabled: !!session?.user?.id,
    });

  const { data: profile } = useSWR(
    session?.user ? "/api/user/profile" : null,
    swrFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true },
  );

  useEffect(() => {
    setLyricsRequested(false);

    if (!currentSong) {
      setCurrentSongLyrics(undefined);
      setIsLoadingLyrics(false);
      return;
    }

    if (currentSong.lyrics !== undefined) {
      lyricsCacheRef.current.set(currentSong.id, currentSong.lyrics);
      setCurrentSongLyrics(currentSong.lyrics);
      setIsLoadingLyrics(false);
      return;
    }

    const cached = lyricsCacheRef.current.get(currentSong.id);
    if (cached !== undefined) {
      setCurrentSongLyrics(cached);
      setIsLoadingLyrics(false);
      return;
    }

    setCurrentSongLyrics(undefined);
    setIsLoadingLyrics(false);
  }, [currentSong?.id, currentSong?.lyrics]);

  const requestCurrentSongLyrics = useCallback(() => {
    setLyricsRequested(true);
  }, []);

  useEffect(() => {
    if (
      !currentSong ||
      (!showLyrics && !showFullscreenLyrics && !lyricsRequested)
    ) {
      return;
    }
    if (currentSongLyrics !== undefined) return;

    const cached = lyricsCacheRef.current.get(currentSong.id);
    if (cached !== undefined) {
      setCurrentSongLyrics(cached);
      return;
    }

    let cancelled = false;
    setIsLoadingLyrics(true);

    fetchSongLyrics(currentSong.slug)
      .then((lyrics) => {
        if (cancelled) return;
        lyricsCacheRef.current.set(currentSong.id, lyrics);
        setCurrentSongLyrics(lyrics);
      })
      .catch(() => {
        if (cancelled) return;
        lyricsCacheRef.current.set(currentSong.id, []);
        setCurrentSongLyrics([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLyrics(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentSong?.id,
    currentSong?.slug,
    currentSongLyrics,
    showLyrics,
    showFullscreenLyrics,
    lyricsRequested,
  ]);

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

  const markSongSeen = useCallback((songId: string) => {
    seenSongIdsRef.current.add(songId);
  }, []);

  const syncLegacyQueue = useCallback((items: QueueItem[]) => {
    const songList = items.map((i) => i.song);
    if (currentSongRef.current) {
      const hasCurrent = songList.some(
        (s) => s.id === currentSongRef.current?.id,
      );
      if (!hasCurrent) {
        setQueue([currentSongRef.current, ...songList]);
        return;
      }
    }
    setQueue(songList);
  }, []);

  const applyUpNext = useCallback(
    (items: QueueItem[]) => {
      setUpNext(items);
      upNextBaselineRef.current = items;
      if (!isShuffled) shuffleOrderRef.current = null;
      persistUserUpNext(items);
      syncLegacyQueue(items);
    },
    [isShuffled, persistUserUpNext, syncLegacyQueue],
  );

  const appendRadioSongs = useCallback(
    (
      newSongs: Song[],
      source: QueueItemSource,
      append: boolean,
    ) => {
      if (newSongs.length === 0) return;
      setUpNext((prev) => {
        const radioItems = createQueueItems(newSongs, source);
        for (const s of newSongs) markSongSeen(s.id);
        const merged = append ? [...prev, ...radioItems] : radioItems;
        upNextBaselineRef.current = merged;
        syncLegacyQueue(merged);
        return merged;
      });
    },
    [markSongSeen, syncLegacyQueue],
  );

  const fetchSimilarSongs = useCallback(
    async (seedId: string, append = true): Promise<Song[]> => {
      if (Date.now() < radioRetryAtRef.current) return [];
      setIsFetchingRadio(true);
      let source: QueueItemSource = "radio";
      try {
        const exclude = Array.from(seenSongIdsRef.current).join(",");
        const res = await fetch(
          `/api/songs/similar?seedSongId=${encodeURIComponent(seedId)}&excludeIds=${encodeURIComponent(exclude)}&limit=${RADIO_BATCH_SIZE}`,
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
          source = "autoplay";
          newSongs = pickAutoplaySongs(
            songs,
            recentlyPlayedSongs,
            seenSongIdsRef.current,
            seedId,
            RADIO_BATCH_SIZE,
          );
        }
        appendRadioSongs(newSongs, source, append);
        return newSongs;
      } catch (error) {
        console.error("Radio fetch error:", error);
        radioRetryAtRef.current = Date.now() + 30_000;
        const fallback = pickAutoplaySongs(
          songs,
          recentlyPlayedSongs,
          seenSongIdsRef.current,
          seedId,
          RADIO_BATCH_SIZE,
        );
        appendRadioSongs(fallback, "autoplay", true);
        return fallback;
      } finally {
        setIsFetchingRadio(false);
      }
    },
    [appendRadioSongs, songs, recentlyPlayedSongs],
  );

  const maybeRefillRadio = useCallback(
    (items: QueueItem[]) => {
      if (!radioMode || !radioSeedSongId) return;
      const radioCount = items.filter(
        (i) => i.source === "radio" || i.source === "autoplay",
      ).length;
      if (radioCount < RADIO_REFETCH_THRESHOLD) {
        void fetchSimilarSongs(radioSeedSongId, true);
      }
    },
    [radioMode, radioSeedSongId, fetchSimilarSongs],
  );

  const enableSmartRadio = useCallback(
    (seedSong: Song, append = true) => {
      userDisabledRadioRef.current = false;
      setRadioMode(true);
      setRadioSeedSongId(seedSong.id);
      markSongSeen(seedSong.id);
      void fetchSimilarSongs(seedSong.id, append);
    },
    [fetchSimilarSongs, markSongSeen],
  );

  const handleSetRadioMode = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        const seed = currentSongRef.current;
        if (!seed) {
          setRadioMode(true);
          return;
        }
        enableSmartRadio(seed, true);
        return;
      }

      userDisabledRadioRef.current = true;
      setRadioMode(false);
      setUpNext((prev) => {
        const next = prev.filter(
          (i) => i.source !== "radio" && i.source !== "autoplay",
        );
        if (next.length === prev.length) return prev;
        upNextBaselineRef.current = next;
        persistUserUpNext(next);
        syncLegacyQueue(next);
        return next;
      });
    },
    [enableSmartRadio, persistUserUpNext, syncLegacyQueue],
  );

  const ensureSmartRadioForEmptyQueue = useCallback(() => {
    const song = currentSongRef.current;
    if (!song || upNextRef.current.length > 0 || userDisabledRadioRef.current) {
      return;
    }

    if (!radioMode || radioSeedSongId !== song.id) {
      enableSmartRadio(song, true);
      return;
    }

    const hasSuggested = upNextRef.current.some(
      (i) => i.source === "radio" || i.source === "autoplay",
    );
    if (!hasSuggested && !isFetchingRadio) {
      void fetchSimilarSongs(song.id, true);
    }
  }, [
    radioMode,
    radioSeedSongId,
    isFetchingRadio,
    enableSmartRadio,
    fetchSimilarSongs,
  ]);

  useEffect(() => {
    ensureSmartRadioForEmptyQueue();
  }, [upNext.length, currentSong?.id, ensureSmartRadioForEmptyQueue]);

  useEffect(() => {
    if (profile && typeof profile.isPremium === "boolean") {
      setIsPremium(profile.isPremium);
      return;
    }
    if (sessionStatus === "loading") return;
    if (!session?.user?.id) {
      setIsPremium(false);
      return;
    }
    if (typeof session.user.isPremium === "boolean") {
      setIsPremium(session.user.isPremium);
    }
  }, [profile, session?.user?.id, session?.user?.isPremium, sessionStatus]);

  useEffect(() => {
    if (songs.length === 0 || hasRestoredUpNextRef.current) return;
    hasRestoredUpNextRef.current = true;

    let restored: QueueItem[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(UP_NEXT_STORAGE_KEY);
        if (raw) {
          const entries = JSON.parse(raw) as PersistedQueueEntry[];
          restored = restoreUserUpNext(entries, (id) => songsById.get(id));
        }
      } catch (error) {
        console.error("Error restoring up next:", error);
      }
    }

    if (restored.length > 0) {
      applyUpNext(restored);
    } else if (queue.length === 0) {
      setQueue(songs);
    }

    if (
      !currentSong &&
      session?.user?.id &&
      typeof window !== "undefined"
    ) {
      try {
        const lastPlayedData = localStorage.getItem(LAST_PLAYED_SONG_KEY);
        const lastPositionData = localStorage.getItem(
          LAST_PLAYBACK_POSITION_KEY,
        );
        if (lastPlayedData) {
          const lastPlayed = JSON.parse(lastPlayedData);
          const foundSong = songs.find((s) => s.id === lastPlayed.id);
          if (foundSong) {
            if (lastPositionData) {
              try {
                const savedPosition = JSON.parse(lastPositionData);
                if (
                  savedPosition.songId === foundSong.id &&
                  typeof savedPosition.timestamp === "number" &&
                  savedPosition.timestamp >= 0 &&
                  savedPosition.timestamp < foundSong.duration
                ) {
                  restorePositionRef.current = savedPosition.timestamp;
                }
              } catch {
                /* ignore */
              }
            }
            setCurrentSong(foundSong);
            markSongSeen(foundSong.id);
          }
        }
      } catch (error) {
        console.error("Error restoring last played song:", error);
      }
    }
  }, [
    songs,
    songsById,
    queue.length,
    currentSong,
    session?.user?.id,
    applyUpNext,
    markSongSeen,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    preloadRef.current = new Audio();
    preloadRef.current.preload = "auto";

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(Math.floor(audioRef.current.currentTime));
      }
    };

    const handleEnded = () => {
      if (currentSongRef.current) {
        savePlaybackPosition(currentSongRef.current.id, 0);
      }
      nextSongRef.current();
    };

    const handleError = async () => {
      console.error("Audio playback error");
      const playbackUrl = currentSongRef.current?.playbackUrl;

      if (playbackUrl) {
        try {
          const response = await fetch(playbackUrl, {
            headers: { Range: "bytes=0-0" },
          });
          if (response.status === 429) {
            const { retryAfterSeconds } = await parseApiErrorBody(response);
            notifyRateLimitError(retryAfterSeconds);
            return;
          }
        } catch {
          // Fall through to generic playback error
        }
      }

      toast.error("Couldn't play this track. Skipping…");
      nextSongRef.current();
    };

    const audio = audioRef.current;
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    const handleBeforeUnload = () => {
      if (audioRef.current && currentSongRef.current) {
        savePlaybackPosition(
          currentSongRef.current.id,
          audioRef.current.currentTime,
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      audio.pause();
      audio.src = "";
      preloadRef.current?.pause();
      if (preloadRef.current) preloadRef.current.src = "";
    };
  }, []);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      if (isChangingSongRef.current) return;
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (
      !audioRef.current ||
      !(currentSong?.playbackUrl || currentSong?.audioUrl)
    ) {
      return;
    }

    const usePreloaded =
      preloadedQidRef.current &&
      upNextRef.current[0]?.qid === preloadedQidRef.current &&
      preloadRef.current?.src;

    if (!usePreloaded && loadedSongIdRef.current === currentSong.id) {
      return;
    }

    loadedSongIdRef.current = currentSong.id;
    isChangingSongRef.current = true;

    audioRef.current.pause();
    if (usePreloaded && preloadRef.current) {
      const preloadedSrc = preloadRef.current.src;
      preloadRef.current.src = "";
      preloadedQidRef.current = null;
      audioRef.current.src = preloadedSrc;
    } else {
      audioRef.current.src =
        currentSong.playbackUrl || currentSong.audioUrl;
    }
    audioRef.current.load();

    if (restorePositionRef.current === null) {
      setCurrentTime(0);
    }

    const handleLoadedMetadata = () => {
      if (audioRef.current && restorePositionRef.current !== null) {
        const position = restorePositionRef.current;
        const duration =
          audioRef.current.duration || currentSong.duration;
        if (position >= 0 && position < duration) {
          audioRef.current.currentTime = position;
          setCurrentTime(position);
        } else {
          setCurrentTime(0);
        }
        restorePositionRef.current = null;
      }
    };

    const handleCanPlay = () => {
      if (audioRef.current && restorePositionRef.current !== null) {
        const position = restorePositionRef.current;
        const duration =
          audioRef.current.duration || currentSong.duration;
        if (position >= 0 && position < duration) {
          audioRef.current.currentTime = position;
          setCurrentTime(position);
        }
        restorePositionRef.current = null;
      }
      isChangingSongRef.current = false;
      if (audioRef.current && isPlayingRef.current) {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      }
      audioRef.current?.removeEventListener("canplay", handleCanPlay);
    };

    audioRef.current.addEventListener("canplay", handleCanPlay);
    audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audioRef.current?.removeEventListener("canplay", handleCanPlay);
      audioRef.current?.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata,
      );
    };
  }, [
    currentSong?.id,
    currentSong?.playbackUrl,
    currentSong?.audioUrl,
    currentSong?.duration,
  ]);

  useEffect(() => {
    if (!currentSong || !preloadRef.current || upNext.length === 0) return;
    const remaining = currentSong.duration - currentTime;
    if (remaining > PRELOAD_SECONDS_BEFORE_END) return;
    const next = upNext[0];
    if (!next || preloadedQidRef.current === next.qid) return;
    const url = next.song.playbackUrl || next.song.audioUrl;
    if (!url) return;
    preloadRef.current.src = url;
    preloadRef.current.load();
    preloadedQidRef.current = next.qid;
  }, [currentTime, currentSong?.id, currentSong?.duration, upNext]);

  const seekingRef = useRef(false);
  useEffect(() => {
    if (!audioRef.current || seekingRef.current) return;
    const audioTime = audioRef.current.currentTime;
    const isUserSeek =
      Math.abs(audioTime - currentTime) >= 1 || currentTime < audioTime - 0.5;
    if (isUserSeek) {
      seekingRef.current = true;
      audioRef.current.currentTime = currentTime;
      if (currentSong) savePlaybackPosition(currentSong.id, currentTime);
      setTimeout(() => {
        seekingRef.current = false;
      }, 100);
    }
  }, [currentTime, currentSong?.id]);

  useEffect(() => {
    if (isPlaying && currentSong) {
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
      }
      positionSaveIntervalRef.current = setInterval(() => {
        if (audioRef.current && currentSong) {
          savePlaybackPosition(
            currentSong.id,
            audioRef.current.currentTime,
          );
        }
      }, POSITION_SAVE_INTERVAL);
      return () => {
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
        }
      };
    }
    if (currentSong && audioRef.current) {
      savePlaybackPosition(currentSong.id, audioRef.current.currentTime);
    }
    if (positionSaveIntervalRef.current) {
      clearInterval(positionSaveIntervalRef.current);
      positionSaveIntervalRef.current = null;
    }
  }, [isPlaying, currentSong?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "q" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setShowQueue((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saveToRecentlyPlayed = async (song: Song) => {
    if (!session?.user?.id || !song?.id) return;
    const songExists = songs.some((s) => s.id === song.id);
    if (!songExists) return;
    try {
      const response = await fetch("/api/play-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, duration: currentTime }),
      });
      if (response.ok) mutatePlayHistory();
    } catch (error) {
      if (error instanceof TypeError && (error as Error).message.includes("fetch")) {
        console.error("Network error saving play history:", error);
      }
    }
  };

  const saveLastPlayedSong = (song: Song) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LAST_PLAYED_SONG_KEY, JSON.stringify(song));
    } catch (error) {
      console.error("Error saving last played song:", error);
    }
  };

  const savePlaybackPosition = (songId: string, timestamp: number) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        LAST_PLAYBACK_POSITION_KEY,
        JSON.stringify({ songId, timestamp, savedAt: Date.now() }),
      );
    } catch (error) {
      console.error("Error saving playback position:", error);
    }
  };

  const requireAuthForUserAction = () => {
    if (sessionStatus === "loading") return false;
    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "play");
      return false;
    }
    return true;
  };

  const pushToHistory = useCallback((song: Song, source: QueueItemSource) => {
    setHistory((prev) => {
      const item = createQueueItem(song, source);
      const next = [...prev, item];
      return next.length > MAX_PLAY_HISTORY
        ? next.slice(-MAX_PLAY_HISTORY)
        : next;
    });
  }, []);

  const playSongInternal = useCallback(
    (song: Song, options?: PlaySongOptions) => {
      if (!options?.skipAuth && !requireAuthForUserAction()) return;

      if (song.isPremium && !isPremium) {
        window.location.href = "/premium";
        return;
      }

      if (currentSong?.id !== song.id) {
        loadedSongIdRef.current = null;
        restorePositionRef.current = null;
        setCurrentTime(0);
        isChangingSongRef.current = true;
      }

      markSongSeen(song.id);
      setCurrentSong(song);
      setIsPlaying(true);
      saveToRecentlyPlayed(song);
      saveLastPlayedSong(song);

      if (options?.upNext !== undefined) {
        const items = createQueueItems(
          options.upNext,
          options.source ?? "playlist",
        );
        applyUpNext(items);
      }

      const hasUpNext =
        options?.upNext !== undefined
          ? options.upNext.length > 0
          : upNextRef.current.length > 0;

      const shouldRadio =
        options?.enableRadio ??
        (!hasUpNext && options?.source !== "playlist");

      if (shouldRadio) {
        enableSmartRadio(song, true);
      } else if (options?.source === "playlist") {
        setRadioMode(false);
      }
    },
    [
      currentSong?.id,
      isPremium,
      markSongSeen,
      upNext.length,
      applyUpNext,
      enableSmartRadio,
    ],
  );

  const playSong = useCallback(
    (song: Song, options?: PlaySongOptions) => {
      playSongInternal(song, options);
    },
    [playSongInternal],
  );

  const playFromContext = useCallback(
    (
      song: Song,
      contextSongs: Song[],
      source: QueueItemSource = "playlist",
    ) => {
      const index = contextSongs.findIndex((s) => s.id === song.id);
      const remaining =
        index >= 0 ? contextSongs.slice(index + 1) : contextSongs;
      playSongInternal(song, {
        source,
        upNext: remaining,
        enableRadio: false,
      });
    },
    [playSongInternal],
  );

  const addToQueue = useCallback(
    (song: Song) => {
      if (!requireAuthForUserAction()) return;
      setUpNext((prev) => {
        const next = [...prev, createQueueItem(song, "user-queue")];
        upNextBaselineRef.current = next;
        persistUserUpNext(next);
        syncLegacyQueue(next);
        return next;
      });
      toast.success("Added to queue");
    },
    [persistUserUpNext, syncLegacyQueue],
  );

  const playNextInQueue = useCallback(
    (song: Song) => {
      if (!requireAuthForUserAction()) return;
      setUpNext((prev) => {
        const next = [createQueueItem(song, "user-queue"), ...prev];
        upNextBaselineRef.current = next;
        persistUserUpNext(next);
        syncLegacyQueue(next);
        return next;
      });
      toast.success("Playing next");
    },
    [persistUserUpNext, syncLegacyQueue],
  );

  const removeFromQueue = useCallback(
    (qid: string) => {
      setUpNext((prev) => {
        const next = prev.filter((i) => i.qid !== qid);
        upNextBaselineRef.current = next;
        persistUserUpNext(next);
        syncLegacyQueue(next);
        return next;
      });
    },
    [persistUserUpNext, syncLegacyQueue],
  );

  const reorderUpNext = useCallback(
    (fromIndex: number, toIndex: number) => {
      setUpNext((prev) => {
        const next = reorderQueueItems(prev, fromIndex, toIndex);
        upNextBaselineRef.current = next;
        persistUserUpNext(next);
        syncLegacyQueue(next);
        return next;
      });
    },
    [persistUserUpNext, syncLegacyQueue],
  );

  const clearQueue = useCallback(() => {
    applyUpNext([]);
    toast.success("Queue cleared");
  }, [applyUpNext]);

  const startRadio = useCallback(
    (seedSong: Song) => {
      if (!requireAuthForUserAction()) return;
      applyUpNext([]);
      playSongInternal(seedSong, { enableRadio: true, skipAuth: true });
    },
    [applyUpNext, playSongInternal],
  );

  const playNextFromSmartRadio = useCallback(() => {
    if (!currentSong) return false;

    const seedId = radioSeedSongId ?? currentSong.id;
    const fallbacks = pickAutoplaySongs(
      songs,
      recentlyPlayedSongs,
      seenSongIdsRef.current,
      seedId,
      1,
    );
    if (fallbacks.length > 0) {
      const items = createQueueItems(fallbacks, "autoplay");
      for (const s of fallbacks) markSongSeen(s.id);
      applyUpNext(items);
      playSongInternal(fallbacks[0], { skipAuth: true });
      void fetchSimilarSongs(seedId, true);
      return true;
    }

    void (async () => {
      const added = await fetchSimilarSongs(seedId, true);
      if (added.length > 0) {
        playSongInternal(added[0], { skipAuth: true });
      } else {
        setIsPlaying(false);
      }
    })();
    return true;
  }, [
    currentSong,
    radioSeedSongId,
    songs,
    recentlyPlayedSongs,
    markSongSeen,
    fetchSimilarSongs,
    applyUpNext,
    playSongInternal,
  ]);

  const isSongQueued = useCallback(
    (songId: string) => {
      if (currentSong?.id === songId) return true;
      return upNext.some((i) => i.song.id === songId);
    },
    [currentSong?.id, upNext],
  );

  const getActiveUpNext = useCallback((): QueueItem[] => {
    if (isShuffled && shuffleOrderRef.current) {
      return shuffleOrderRef.current;
    }
    return upNext;
  }, [isShuffled, upNext]);

  const advanceToNext = useCallback(() => {
    if (!currentSong) return;

    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    const sourceForHistory: QueueItemSource = radioMode ? "radio" : "playlist";
    pushToHistory(currentSong, sourceForHistory);

    const active = getActiveUpNext();

    if (active.length > 0) {
      const [nextItem, ...rest] = active;
      if (isShuffled && shuffleOrderRef.current) {
        shuffleOrderRef.current = rest;
      }
      setUpNext(rest);
      upNextBaselineRef.current = rest;
      persistUserUpNext(rest);
      syncLegacyQueue(rest);
      playSongInternal(nextItem.song, { skipAuth: true });
      maybeRefillRadio(rest);
      return;
    }

    if (repeatMode === "all" && history.length > 0) {
      const replay = [...history].reverse().map((h) =>
        createQueueItem(h.song, h.source),
      );
      setHistory([]);
      applyUpNext(replay);
      playSongInternal(replay[0].song, { skipAuth: true });
      return;
    }

    if (radioMode && radioSeedSongId) {
      playNextFromSmartRadio();
      return;
    }

    if (!userDisabledRadioRef.current && currentSong) {
      enableSmartRadio(currentSong, true);
      playNextFromSmartRadio();
      return;
    }

    setIsPlaying(false);
  }, [
    currentSong,
    repeatMode,
    radioMode,
    radioSeedSongId,
    pushToHistory,
    getActiveUpNext,
    isShuffled,
    history,
    playSongInternal,
    maybeRefillRadio,
    persistUserUpNext,
    syncLegacyQueue,
    applyUpNext,
    enableSmartRadio,
    playNextFromSmartRadio,
  ]);

  const nextSong = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

  const prevSong = useCallback(() => {
    if (!currentSong) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const last = history[history.length - 1];
    if (!last) return;

    setHistory((prev) => prev.slice(0, -1));
    const backItem = createQueueItem(currentSong, "playlist");
    setUpNext((prev) => {
      const next = [backItem, ...prev];
      upNextBaselineRef.current = next;
      persistUserUpNext(next);
      syncLegacyQueue(next);
      return next;
    });
    playSongInternal(last.song, { skipAuth: true });
  }, [
    currentSong,
    history,
    playSongInternal,
    persistUserUpNext,
    syncLegacyQueue,
  ]);

  useEffect(() => {
    nextSongRef.current = nextSong;
  }, [nextSong]);

  const handleSetIsShuffled = useCallback(
    (shuffled: boolean) => {
      setIsShuffled(shuffled);
      if (shuffled) {
        shuffleOrderRef.current = shuffleUpNext(upNextBaselineRef.current);
      } else {
        shuffleOrderRef.current = null;
        setUpNext(upNextBaselineRef.current);
        syncLegacyQueue(upNextBaselineRef.current);
      }
    },
    [syncLegacyQueue],
  );

  const togglePlay = () => {
    if (!requireAuthForUserAction()) return;
    setIsPlaying(!isPlaying);
  };

  const getRecentlyPlayed = (): Song[] => {
    return session?.user?.id ? recentlyPlayedSongs : [];
  };

  useMediaSession({
    song: currentSong,
    isPlaying,
    currentTime,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onNext: nextSong,
    onPrev: prevSong,
    onSeek: (time) => setCurrentTime(time),
  });

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        currentSongLyrics,
        isLoadingLyrics,
        isPlaying,
        currentTime,
        queue,
        upNext,
        history,
        isPremium,
        showLyrics,
        showFullscreenLyrics,
        showNowPlaying,
        showQueue,
        volume,
        isMuted,
        isShuffled,
        repeatMode,
        radioMode,
        radioSeedSongId,
        isFetchingRadio,
        audioRef,
        setCurrentSong,
        setIsPlaying,
        setCurrentTime,
        setQueue,
        setIsPremium,
        setShowLyrics,
        setShowFullscreenLyrics,
        setShowNowPlaying,
        requestCurrentSongLyrics,
        setShowQueue,
        setVolume,
        setIsMuted,
        setIsShuffled: handleSetIsShuffled,
        setRepeatMode,
        setRadioMode: handleSetRadioMode,
        playSong,
        playFromContext,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        reorderUpNext,
        clearQueue,
        startRadio,
        isSongQueued,
        togglePlay,
        nextSong,
        prevSong,
        upgradePremium: () => {},
        getRecentlyPlayed,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
