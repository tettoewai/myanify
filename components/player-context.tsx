"use client";

import { useLyricsLoader } from "@/hooks/use-lyrics-loader";
import { useMediaSession } from "@/hooks/use-media-session";
import { useQueue } from "@/hooks/use-queue";
import { useRadioFetch } from "@/hooks/use-radio-fetch";
import {
  notifyRateLimitError,
  parseApiErrorBody,
  swrFetcher,
} from "@/lib/api-client";
import {
  createQueueItem,
  createQueueItems,
  pickAutoplaySongs,
  RADIO_REFETCH_THRESHOLD,
  reorderQueueItems,
  restoreUserUpNext,
  UP_NEXT_STORAGE_KEY,
  type PersistedQueueEntry,
} from "@/lib/queue";
import { requireLoginRedirect } from "@/lib/require-login";
import { usePlayHistory, useSongs } from "@/lib/swr";
import type { LyricLine, QueueItem, QueueItemSource, Song } from "@/lib/types";
import { useSession } from "next-auth/react";
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
import { toast } from "sonner";
import useSWR from "swr";

// ─── Constants ───────────────────────────────────────────────────────────────

const LAST_PLAYED_SONG_KEY = "myanify_last_played_song";
const LAST_PLAYBACK_POSITION_KEY = "myanify_last_playback_position";
const VOLUME_STORAGE_KEY = "myanify_volume";
const MAX_RECENTLY_PLAYED = 50;
const POSITION_SAVE_INTERVAL_MS = 5_000;
const PRELOAD_SECONDS_BEFORE_END = 20;
const CROSSFADE_DURATION_MS = 2_000;
const PREV_SONG_RESTART_THRESHOLD_S = 3;

const RADIO_SOURCES: QueueItemSource[] = ["radio", "autoplay"];

// ─── Types ───────────────────────────────────────────────────────────────────

export type RepeatMode = "off" | "all" | "one";

export interface PlaySongOptions {
  source?: QueueItemSource;
  upNext?: Song[];
  enableRadio?: boolean;
  /** Skip the auth gate — for internal advances (next/prev, autoplay). */
  skipAuth?: boolean;
}

export interface SleepTimer {
  /** Unix ms when the timer fires. */
  endsAt: number;
  /** Original duration in minutes, for display purposes. */
  durationMinutes: number;
}

interface PlayerContextType {
  // ── Playback state ──
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;

  // ── Queue / history ──
  /** Flat legacy list kept for backward compat — prefer upNext. */
  queue: Song[];
  upNext: QueueItem[];
  history: QueueItem[];

  // ── Modes ──
  isShuffled: boolean;
  repeatMode: RepeatMode;
  radioMode: boolean;
  radioSeedSongId: string | null;
  isFetchingRadio: boolean;

  // ── Lyrics ──
  currentSongLyrics: LyricLine[] | undefined;
  isLoadingLyrics: boolean;

  // ── UI panels ──
  showLyrics: boolean;
  showFullscreenLyrics: boolean;
  showNowPlaying: boolean;
  showQueue: boolean;
  openMobileLyricsTab: boolean;

  // ── Entitlements ──
  isPremium: boolean;

  // ── Features ──
  sleepTimer: SleepTimer | null;

  // ── Refs ──
  audioRef: RefObject<HTMLAudioElement | null>;

  // ── Actions: playback ──
  playSong: (song: Song, options?: PlaySongOptions) => void;
  playFromContext: (
    song: Song,
    contextSongs: Song[],
    source?: QueueItemSource,
  ) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;

  // ── Actions: queue ──
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  removeFromQueue: (qid: string) => void;
  reorderUpNext: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // ── Actions: radio ──
  startRadio: (seedSong: Song) => void;
  isSongQueued: (songId: string) => boolean;

  // ── Actions: controls ──
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsShuffled: (shuffled: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setRadioMode: (enabled: boolean) => void;

  // ── Actions: UI ──
  setShowLyrics: (show: boolean) => void;
  setShowFullscreenLyrics: (show: boolean) => void;
  setShowNowPlaying: (show: boolean) => void;
  setOpenMobileLyricsTab: (open: boolean) => void;
  setShowQueue: (show: boolean) => void;
  requestCurrentSongLyrics: () => void;

  // ── Actions: misc ──
  setSleepTimer: (minutes: number | null) => void;
  getRecentlyPlayed: () => Song[];
  setIsPremium: (premium: boolean) => void;

  // ── Setters kept for external use ──
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setQueue: (songs: Song[]) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readVolume(): number {
  if (typeof window === "undefined") return 80;
  return Number(localStorage.getItem(VOLUME_STORAGE_KEY) ?? 80);
}

function isRadioSource(source: QueueItemSource): boolean {
  return RADIO_SOURCES.includes(source);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();

  // ── Core playback state ──
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(readVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);

  // ── Queue & history ──
  const [queue, setQueue] = useState<Song[]>([]);
  const {
    upNext,
    history,
    applyUpNext,
    append: appendToQueue,
    appendOne: appendOneToQueue,
    prependOne: prependOneToQueue,
    remove: removeFromQueueByQid,
    reorder: reorderQueue,
    clear: clearQueueInternal,
    pushToHistory,
    removeFromHistory,
    clearHistory,
    getActiveUpNext,
    advanceQueue,
    toggleShuffle: toggleQueueShuffle,
    baselineRef: upNextBaselineRef,
  } = useQueue([]);

  // ── Modes ──
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [radioMode, setRadioMode] = useState(false);
  const [radioSeedSongId, setRadioSeedSongId] = useState<string | null>(null);

  // ── Lyrics ──
  const {
    lyrics: currentSongLyrics,
    isLoading: isLoadingLyrics,
    request: requestCurrentSongLyrics,
  } = useLyricsLoader(currentSong ?? undefined);

  // ── UI ──
  const [showLyrics, setShowLyrics] = useState(false);
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [openMobileLyricsTab, setOpenMobileLyricsTab] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // ── Entitlements ──
  const [isPremium, setIsPremium] = useState(false);

  // ── Features ──
  const [sleepTimer, setSleepTimerState] = useState<SleepTimer | null>(null);

  // ── Radio fetch ──
  const { isFetching: isFetchingRadio, fetchSimilarSongs: radioFetchSimilar } =
    useRadioFetch();

  // ─── Refs ──────────────────────────────────────────────────────────────────
  // Audio elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);

  // Stable copies of frequently-read state (avoids stale closures in callbacks)
  const currentSongRef = useRef<Song | null>(null);
  const isPlayingRef = useRef(false);
  const currentTimeRef = useRef(0); // fix: stale currentTime in saveToRecentlyPlayed
  const upNextRef = useRef<QueueItem[]>([]);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  // Playback lifecycle
  const isChangingSongRef = useRef(false);
  const loadedSongIdRef = useRef<string | null>(null);
  const restorePositionRef = useRef<number | null>(null);
  const seekingRef = useRef(false);
  const hasRestoredUpNextRef = useRef(false);

  // Queue helpers
  const nextSongRef = useRef<() => void>(() => { });
  const seenSongIdsRef = useRef<Set<string>>(new Set());
  const radioRetryAtRef = useRef(0);
  const userDisabledRadioRef = useRef(false);

  // Preload / crossfade
  const preloadedQidRef = useRef<string | null>(null);
  const crossfadeRafRef = useRef<number | null>(null);

  // Position save
  const positionSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sleep timer
  const sleepTimerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Keep refs in sync with state ─────────────────────────────────────────

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    upNextRef.current = upNext;
  }, [upNext]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const { songs } = useSongs({ isPublished: true, enabled: radioMode });
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

  // ─── Auth helper ───────────────────────────────────────────────────────────

  /**
   * Returns true if the current user can take actions.
   * As a side effect, redirects unauthenticated users to the login page.
   */
  const isAuthenticated = useCallback((): boolean => {
    if (sessionStatus === "loading") return false;
    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "play");
      return false;
    }
    return true;
  }, [session?.user?.id, sessionStatus]);

  // ─── Persistence helpers ───────────────────────────────────────────────────

  const savePlaybackPosition = useCallback(
    (songId: string, timestamp: number) => {
      if (typeof window === "undefined") return;
      try {
        localStorage.setItem(
          LAST_PLAYBACK_POSITION_KEY,
          JSON.stringify({ songId, timestamp, savedAt: Date.now() }),
        );
      } catch (err) {
        console.error("[Player] Failed to save playback position:", err);
      }
    },
    [],
  );

  const saveLastPlayedSong = useCallback((song: Song) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LAST_PLAYED_SONG_KEY, JSON.stringify(song));
    } catch (err) {
      console.error("[Player] Failed to save last played song:", err);
    }
  }, []);

  const saveToRecentlyPlayed = useCallback(
    async (song: Song) => {
      if (!session?.user?.id || !song?.id) return;
      try {
        // Use the ref so we always have the live currentTime, not the closure value
        const response = await fetch("/api/play-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            songId: song.id,
            duration: currentTimeRef.current,
          }),
        });
        if (response.ok) mutatePlayHistory();
      } catch (err) {
        if (err instanceof TypeError) {
          console.error("[Player] Network error saving play history:", err);
        }
      }
    },
    [session?.user?.id, mutatePlayHistory],
  );

  // ─── Sync: volume & audio element ─────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // ─── Sync: premium / profile ───────────────────────────────────────────────

  useEffect(() => {
    if (profile && typeof profile.isPremium === "boolean") {
      setIsPremium(profile.isPremium);
      return;
    }
    if (sessionStatus === "loading" || !session?.user?.id) {
      setIsPremium(false);
      return;
    }
    if (typeof session.user.isPremium === "boolean") {
      setIsPremium(session.user.isPremium);
    }
  }, [profile, session?.user?.id, session?.user?.isPremium, sessionStatus]);

  // ─── Queue helpers ─────────────────────────────────────────────────────────

  /**
   * Syncs the legacy flat `queue` array from a given upNext list.
   * Always prepends the current song so consumers get a complete picture.
   */
  const syncLegacyQueue = useCallback((items: QueueItem[]) => {
    const songs = items.map((i) => i.song);
    if (currentSongRef.current) {
      const hasCurrent = songs.some((s) => s.id === currentSongRef.current?.id);
      setQueue(hasCurrent ? songs : [currentSongRef.current, ...songs]);
    } else {
      setQueue(songs);
    }
  }, []);

  const syncLegacyQueueForUpNext = useCallback(
    (items: QueueItem[]) => {
      applyUpNext(items);
      syncLegacyQueue(items);
    },
    [applyUpNext, syncLegacyQueue],
  );

  const markSongSeen = useCallback((songId: string) => {
    seenSongIdsRef.current.add(songId);
  }, []);

  // ─── Radio ─────────────────────────────────────────────────────────────────

  const appendRadioSongs = useCallback(
    (newSongs: Song[], source: QueueItemSource, append: boolean) => {
      if (newSongs.length === 0) return;
      for (const s of newSongs) markSongSeen(s.id);
      if (append) {
        appendToQueue(newSongs, source);
      } else {
        const items = createQueueItems(newSongs, source);
        applyUpNext(items);
        syncLegacyQueue(items);
      }
    },
    [markSongSeen, appendToQueue, applyUpNext, syncLegacyQueue],
  );

  const fetchSimilarSongs = useCallback(
    async (seedId: string, append = true): Promise<Song[]> => {
      if (Date.now() < radioRetryAtRef.current) return [];
      try {
        const { songs: newSongs, source } = await radioFetchSimilar(
          seedId,
          seenSongIdsRef.current,
          recentlyPlayedSongs,
          songs,
        );
        appendRadioSongs(newSongs, source, append);
        return newSongs;
      } catch (err) {
        console.error("[Player] Radio fetch error:", err);
        radioRetryAtRef.current = Date.now() + 30_000;
        return [];
      }
    },
    [appendRadioSongs, radioFetchSimilar, songs, recentlyPlayedSongs],
  );

  const maybeRefillRadio = useCallback(
    (items: QueueItem[]) => {
      if (!radioMode || !radioSeedSongId) return;
      const radioCount = items.filter((i) => isRadioSource(i.source)).length;
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

  // Refill radio queue when it runs low
  useEffect(() => {
    if (!radioMode || !radioSeedSongId) return;
    if (upNext.length > 0 || userDisabledRadioRef.current) return;
    const song = currentSongRef.current;
    if (!song) return;

    if (radioSeedSongId !== song.id) {
      enableSmartRadio(song, true);
      return;
    }
    const hasSuggested = upNextRef.current.some((i) => isRadioSource(i.source));
    if (!hasSuggested && !isFetchingRadio) {
      void fetchSimilarSongs(song.id, true);
    }
  }, [
    upNext.length,
    radioMode,
    radioSeedSongId,
    isFetchingRadio,
    enableSmartRadio,
    fetchSimilarSongs,
  ]);

  // Auto-enable smart radio when queue empties and radio isn't explicitly off
  useEffect(() => {
    if (upNext.length > 0 || userDisabledRadioRef.current || radioMode) return;
    const song = currentSongRef.current;
    if (!song) return;
    enableSmartRadio(song, true);
  }, [upNext.length, radioMode, enableSmartRadio]);

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
      const filtered = upNextRef.current.filter(
        (i) => !isRadioSource(i.source),
      );
      if (filtered.length < upNextRef.current.length) {
        applyUpNext(filtered);
        syncLegacyQueue(filtered);
      }
    },
    [enableSmartRadio, applyUpNext, syncLegacyQueue],
  );

  // ─── Core: playSong ────────────────────────────────────────────────────────

  /**
   * The single entry point for all song changes.
   * All other play helpers ultimately call this.
   */
  const playSong = useCallback(
    (song: Song, options?: PlaySongOptions) => {
      if (!options?.skipAuth && !isAuthenticated()) return;

      if (song.isPremium && !isPremium) {
        window.location.href = "/premium";
        return;
      }

      // Cancel any in-progress crossfade and reset audio volume
      if (currentSongRef.current?.id !== song.id) {
        if (crossfadeRafRef.current) {
          cancelAnimationFrame(crossfadeRafRef.current);
          crossfadeRafRef.current = null;
        }
        if (audioRef.current) {
          audioRef.current.volume = isMutedRef.current
            ? 0
            : volumeRef.current / 100;
        }
        loadedSongIdRef.current = null;
        restorePositionRef.current = null;
        setCurrentTime(0);
        isChangingSongRef.current = true;
      }

      markSongSeen(song.id);
      setCurrentSong(song);
      setIsPlaying(true);
      void saveToRecentlyPlayed(song);
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

      const shouldEnableRadio =
        options?.enableRadio ?? (!hasUpNext && options?.source !== "playlist");

      if (shouldEnableRadio) {
        enableSmartRadio(song, true);
      } else if (options?.source === "playlist") {
        setRadioMode(false);
      }
    },
    [
      isAuthenticated,
      isPremium,
      markSongSeen,
      saveToRecentlyPlayed,
      saveLastPlayedSong,
      applyUpNext,
      enableSmartRadio,
    ],
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
      playSong(song, { source, upNext: remaining, enableRadio: false });
    },
    [playSong],
  );

  // ─── Navigation: next / prev ───────────────────────────────────────────────

  const playNextFromSmartRadio = useCallback(() => {
    if (!currentSongRef.current) return false;

    const seedId = radioSeedSongId ?? currentSongRef.current.id;
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
      playSong(fallbacks[0], { skipAuth: true });
      void fetchSimilarSongs(seedId, true);
      return true;
    }

    void (async () => {
      const added = await fetchSimilarSongs(seedId, true);
      if (added.length > 0) {
        playSong(added[0], { skipAuth: true });
      } else {
        setIsPlaying(false);
      }
    })();
    return true;
  }, [
    radioSeedSongId,
    songs,
    recentlyPlayedSongs,
    markSongSeen,
    fetchSimilarSongs,
    applyUpNext,
    playSong,
  ]);

  const getActiveUpNextShuffled = useCallback(
    () => getActiveUpNext(isShuffled),
    [getActiveUpNext, isShuffled],
  );

  const nextSong = useCallback(() => {
    if (!currentSongRef.current) return;

    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    const sourceForHistory: QueueItemSource = radioMode ? "radio" : "playlist";
    pushToHistory(currentSongRef.current, sourceForHistory);

    const active = getActiveUpNextShuffled();

    if (active.length > 0) {
      const [nextItem, ...rest] = active;
      advanceQueue();
      syncLegacyQueue(rest);
      playSong(nextItem.song, { skipAuth: true });
      if (radioMode && isRadioSource(nextItem.source)) {
        setRadioSeedSongId(nextItem.song.id);
        markSongSeen(nextItem.song.id);
      }
      maybeRefillRadio(rest);
      return;
    }

    if (repeatMode === "all" && history.length > 0) {
      const replay = [...history]
        .reverse()
        .map((h) => createQueueItem(h.song, h.source));
      clearHistory();
      applyUpNext(replay);
      syncLegacyQueue(replay);
      playSong(replay[0].song, { skipAuth: true });
      return;
    }

    if (radioMode && radioSeedSongId) {
      playNextFromSmartRadio();
      return;
    }

    if (!userDisabledRadioRef.current && currentSongRef.current) {
      enableSmartRadio(currentSongRef.current, true);
      playNextFromSmartRadio();
      return;
    }

    setIsPlaying(false);
  }, [
    repeatMode,
    radioMode,
    radioSeedSongId,
    pushToHistory,
    getActiveUpNextShuffled,
    history,
    playSong,
    maybeRefillRadio,
    applyUpNext,
    syncLegacyQueue,
    enableSmartRadio,
    playNextFromSmartRadio,
    advanceQueue,
    clearHistory,
    markSongSeen,
  ]);

  const prevSong = useCallback(() => {
    if (!currentSongRef.current) return;

    // Restart current track if past the threshold
    if (
      audioRef.current &&
      audioRef.current.currentTime > PREV_SONG_RESTART_THRESHOLD_S
    ) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const last = history[history.length - 1];
    if (!last) return;

    removeFromHistory(history.length - 1);
    const backItem = createQueueItem(currentSongRef.current, "playlist");
    prependOneToQueue(currentSongRef.current, "playlist");
    syncLegacyQueue([backItem, ...upNextRef.current]);
    playSong(last.song, { skipAuth: true });
  }, [
    history,
    playSong,
    prependOneToQueue,
    removeFromHistory,
    syncLegacyQueue,
  ]);

  // Keep nextSongRef fresh for the 'ended' event listener
  useEffect(() => {
    nextSongRef.current = nextSong;
  }, [nextSong]);

  // ─── Seek ──────────────────────────────────────────────────────────────────

  /**
   * Named seek action — use this instead of raw setCurrentTime to seek.
   * setCurrentTime is still exposed for the progress bar dragging pattern.
   */
  const seekTo = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      const clamped = Math.max(
        0,
        Math.min(seconds, audioRef.current.duration ?? Infinity),
      );
      seekingRef.current = true;
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      if (currentSongRef.current)
        savePlaybackPosition(currentSongRef.current.id, clamped);
      setTimeout(() => {
        seekingRef.current = false;
      }, 100);
    },
    [savePlaybackPosition],
  );

  // Sync external setCurrentTime calls (e.g. progress bar scrubbing) to audio element.
  // Any large delta (>0.3s) is treated as a seek — matches lyrics-sync isSeekEvent threshold
  useEffect(() => {
    if (!audioRef.current || seekingRef.current) return;
    const audioTime = audioRef.current.currentTime;
    const delta = Math.abs(audioTime - currentTime);
    if (delta > 0.3) {
      seekingRef.current = true;
      audioRef.current.currentTime = currentTime;
      if (currentSongRef.current)
        savePlaybackPosition(currentSongRef.current.id, currentTime);
      setTimeout(() => {
        seekingRef.current = false;
      }, 100);
    }
  }, [currentTime, savePlaybackPosition]);

  // ─── Playback rate ─────────────────────────────────────────────────────────

  const setPlaybackRate = useCallback((rate: number) => {
    const clamped = Math.max(0.5, Math.min(rate, 2));
    setPlaybackRateState(clamped);
    if (audioRef.current) audioRef.current.playbackRate = clamped;
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // ─── Sleep timer ───────────────────────────────────────────────────────────

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerTimeoutRef.current) {
      clearTimeout(sleepTimerTimeoutRef.current);
      sleepTimerTimeoutRef.current = null;
    }

    if (minutes === null || minutes <= 0) {
      setSleepTimerState(null);
      return;
    }

    const endsAt = Date.now() + minutes * 60 * 1000;
    setSleepTimerState({ endsAt, durationMinutes: minutes });
    toast.success(
      `Sleep timer set for ${minutes} minute${minutes === 1 ? "" : "s"}`,
    );

    sleepTimerTimeoutRef.current = setTimeout(
      () => {
        setIsPlaying(false);
        setSleepTimerState(null);
        toast("Sleep timer ended — playback paused");
      },
      minutes * 60 * 1000,
    );
  }, []);

  // Clean up sleep timer on unmount
  useEffect(
    () => () => {
      if (sleepTimerTimeoutRef.current)
        clearTimeout(sleepTimerTimeoutRef.current);
    },
    [],
  );

  // ─── Queue actions ─────────────────────────────────────────────────────────

  const addToQueue = useCallback(
    (song: Song) => {
      if (!isAuthenticated()) return;
      appendOneToQueue(song, "user-queue");
      syncLegacyQueue([
        ...upNextRef.current,
        createQueueItem(song, "user-queue"),
      ]);
      toast.success("Added to queue");
    },
    [isAuthenticated, appendOneToQueue, syncLegacyQueue],
  );

  const playNextInQueue = useCallback(
    (song: Song) => {
      if (!isAuthenticated()) return;
      prependOneToQueue(song, "user-queue");
      syncLegacyQueue([
        createQueueItem(song, "user-queue"),
        ...upNextRef.current,
      ]);
      toast.success("Playing next");
    },
    [isAuthenticated, prependOneToQueue, syncLegacyQueue],
  );

  const removeFromQueue = useCallback(
    (qid: string) => {
      removeFromQueueByQid(qid);
      syncLegacyQueue(upNextRef.current.filter((i) => i.qid !== qid));
    },
    [removeFromQueueByQid, syncLegacyQueue],
  );

  const reorderUpNext = useCallback(
    (fromIndex: number, toIndex: number) => {
      reorderQueue(fromIndex, toIndex);
      syncLegacyQueue(reorderQueueItems(upNextRef.current, fromIndex, toIndex));
    },
    [reorderQueue, syncLegacyQueue],
  );

  const clearQueue = useCallback(() => {
    clearQueueInternal();
    setQueue([]);
    toast.success("Queue cleared");
  }, [clearQueueInternal]);

  const startRadio = useCallback(
    (seedSong: Song) => {
      if (!isAuthenticated()) return;
      clearQueueInternal();
      setQueue([]);
      playSong(seedSong, { enableRadio: true, skipAuth: true });
    },
    [isAuthenticated, clearQueueInternal, playSong],
  );

  const isSongQueued = useCallback(
    (songId: string) =>
      currentSongRef.current?.id === songId ||
      upNextRef.current.some((i) => i.song.id === songId),
    [],
  );

  // ─── Shuffle ───────────────────────────────────────────────────────────────

  const handleSetIsShuffled = useCallback(
    (shuffled: boolean) => {
      setIsShuffled(shuffled);
      toggleQueueShuffle(shuffled);
      if (!shuffled) {
        applyUpNext(upNextBaselineRef.current);
        syncLegacyQueue(upNextBaselineRef.current);
      }
    },
    [toggleQueueShuffle, applyUpNext, syncLegacyQueue, upNextBaselineRef],
  );

  // ─── Toggle play ───────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    if (!isAuthenticated()) return;
    setIsPlaying((prev) => !prev);
  }, [isAuthenticated]);

  // ─── Audio element setup ───────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    preloadRef.current = new Audio();
    preloadRef.current.preload = "auto";

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      // Cancel any still-running crossfade before advancing
      if (crossfadeRafRef.current) {
        cancelAnimationFrame(crossfadeRafRef.current);
        crossfadeRafRef.current = null;
      }
      if (currentSongRef.current)
        savePlaybackPosition(currentSongRef.current.id, 0);
      nextSongRef.current();
    };

    const onError = async () => {
      console.error("[Player] Audio playback error");
      isChangingSongRef.current = false;
      const playbackUrl = currentSongRef.current?.playbackUrl;
      if (playbackUrl) {
        try {
          const res = await fetch(playbackUrl, {
            headers: { Range: "bytes=0-0" },
          });
          if (res.status === 429) {
            const { retryAfterSeconds } = await parseApiErrorBody(res);
            notifyRateLimitError(retryAfterSeconds);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      toast.error("Couldn't play this track. Skipping…");
      nextSongRef.current();
    };

    const onBeforeUnload = () => {
      if (currentSongRef.current) {
        savePlaybackPosition(currentSongRef.current.id, audio.currentTime);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      window.removeEventListener("beforeunload", onBeforeUnload);
      audio.pause();
      audio.src = "";
      if (preloadRef.current) {
        preloadRef.current.pause();
        preloadRef.current.src = "";
      }
    };
  }, [savePlaybackPosition]);

  // ─── Play / pause effect ───────────────────────────────────────────────────

  useEffect(() => {
    if (!audioRef.current || isChangingSongRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.error("[Player] play() rejected:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // ─── Load new song into audio element ─────────────────────────────────────

  useEffect(() => {
    if (
      !audioRef.current ||
      !(currentSong?.playbackUrl || currentSong?.audioUrl)
    )
      return;

    const nextQid = upNextRef.current[0]?.qid;
    const canUsePreload =
      preloadedQidRef.current &&
      nextQid === preloadedQidRef.current &&
      !!preloadRef.current?.src;

    // Avoid reloading the same song (e.g. on unrelated re-renders)
    if (!canUsePreload && loadedSongIdRef.current === currentSong.id) return;

    loadedSongIdRef.current = currentSong.id;
    isChangingSongRef.current = true;

    audioRef.current.pause();

    if (canUsePreload && preloadRef.current) {
      // Gapless: swap the preloaded element's src in
      const src = preloadRef.current.src;
      preloadRef.current.src = "";
      preloadedQidRef.current = null;
      audioRef.current.src = src;
    } else {
      audioRef.current.src = currentSong.playbackUrl || currentSong.audioUrl;
    }

    audioRef.current.playbackRate = playbackRate;
    audioRef.current.load();

    if (restorePositionRef.current === null) setCurrentTime(0);

    const applyRestoredPosition = () => {
      if (!audioRef.current || restorePositionRef.current === null) return;
      const pos = restorePositionRef.current;
      const duration = audioRef.current.duration || currentSong.duration;
      if (pos >= 0 && pos < duration) {
        audioRef.current.currentTime = pos;
        setCurrentTime(pos);
      } else {
        setCurrentTime(0);
      }
      restorePositionRef.current = null;
    };

    let canPlayFired = false;
    const clearChangingFlag = () => {
      if (!canPlayFired) {
        canPlayFired = true;
        isChangingSongRef.current = false;
      }
    };

    const onLoadedMetadata = () => {
      applyRestoredPosition();
      // Fallback: if canplay never fires, clear after 2s
      setTimeout(clearChangingFlag, 2000);
    };

    const onCanPlay = () => {
      applyRestoredPosition();
      clearChangingFlag();
      if (audioRef.current && isPlayingRef.current) {
        audioRef.current.play().catch((err) => {
          console.error("[Player] play() rejected after load:", err);
          setIsPlaying(false);
        });
      }
      audioRef.current?.removeEventListener("canplay", onCanPlay);
    };

    const onLoadError = () => {
      clearChangingFlag();
    };

    audioRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
    audioRef.current.addEventListener("canplay", onCanPlay);
    audioRef.current.addEventListener("error", onLoadError);

    return () => {
      audioRef.current?.removeEventListener("loadedmetadata", onLoadedMetadata);
      audioRef.current?.removeEventListener("canplay", onCanPlay);
      audioRef.current?.removeEventListener("error", onLoadError);
    };
  }, [
    currentSong?.id,
    currentSong?.playbackUrl,
    currentSong?.audioUrl,
    currentSong?.duration,
    playbackRate,
  ]);

  // ─── Preload next + crossfade ──────────────────────────────────────────────

  useEffect(() => {
    if (!currentSong || !preloadRef.current || upNext.length === 0) return;

    const trackDuration =
      audioRef.current?.duration &&
        Number.isFinite(audioRef.current.duration) &&
        audioRef.current.duration > 0
        ? audioRef.current.duration
        : currentSong.duration;

    const remaining = trackDuration - currentTime;
    if (remaining > PRELOAD_SECONDS_BEFORE_END) return;

    const next = upNext[0];
    if (!next) return;

    // Begin preloading if not already done for this queue item
    if (preloadedQidRef.current !== next.qid) {
      const url = next.song.playbackUrl || next.song.audioUrl;
      if (!url) return;
      preloadRef.current.src = url;
      preloadRef.current.load();
      preloadedQidRef.current = next.qid;
    }

    // Start crossfade in the final CROSSFADE_DURATION_MS
    if (remaining * 1000 > CROSSFADE_DURATION_MS || crossfadeRafRef.current)
      return;

    const startTime = performance.now();
    const startVolume = isMuted ? 0 : volume / 100;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / CROSSFADE_DURATION_MS, 1);
      if (audioRef.current)
        audioRef.current.volume = startVolume * (1 - progress);
      if (progress < 1) {
        crossfadeRafRef.current = requestAnimationFrame(tick);
      } else {
        crossfadeRafRef.current = null;
        // 'ended' event will fire naturally and advance the queue
      }
    };
    crossfadeRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (crossfadeRafRef.current) {
        cancelAnimationFrame(crossfadeRafRef.current);
        crossfadeRafRef.current = null;
      }
      // Always restore volume when this effect re-runs / cleans up
      if (audioRef.current) {
        audioRef.current.volume = isMutedRef.current
          ? 0
          : volumeRef.current / 100;
      }
    };
  }, [
    currentTime,
    currentSong?.id,
    currentSong?.duration,
    upNext,
    volume,
    isMuted,
  ]);

  // ─── Periodic position save ────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying && currentSong) {
      positionSaveIntervalRef.current = setInterval(() => {
        if (audioRef.current && currentSongRef.current) {
          savePlaybackPosition(
            currentSongRef.current.id,
            audioRef.current.currentTime,
          );
        }
      }, POSITION_SAVE_INTERVAL_MS);
      return () => {
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
          positionSaveIntervalRef.current = null;
        }
      };
    }

    // Save on pause
    if (currentSong && audioRef.current) {
      savePlaybackPosition(currentSong.id, audioRef.current.currentTime);
    }
    if (positionSaveIntervalRef.current) {
      clearInterval(positionSaveIntervalRef.current);
      positionSaveIntervalRef.current = null;
    }
  }, [isPlaying, currentSong?.id, savePlaybackPosition]);

  // ─── Session restore ───────────────────────────────────────────────────────

  useEffect(() => {
    if (songs.length === 0 || hasRestoredUpNextRef.current) return;
    hasRestoredUpNextRef.current = true;

    // Restore persisted queue
    let restored: QueueItem[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(UP_NEXT_STORAGE_KEY);
        if (raw) {
          const entries = JSON.parse(raw) as PersistedQueueEntry[];
          restored = restoreUserUpNext(entries, (id) => songsById.get(id));
        }
      } catch (err) {
        console.error("[Player] Error restoring up next:", err);
      }
    }

    if (restored.length > 0) {
      applyUpNext(restored);
    } else if (queue.length === 0) {
      setQueue(songs);
    }

    // Restore last played song + seek position
    if (!currentSong && session?.user?.id && typeof window !== "undefined") {
      try {
        const lastPlayedRaw = localStorage.getItem(LAST_PLAYED_SONG_KEY);
        if (lastPlayedRaw) {
          const lastPlayed = JSON.parse(lastPlayedRaw);
          const foundSong = songs.find((s) => s.id === lastPlayed.id);
          if (foundSong) {
            const posRaw = localStorage.getItem(LAST_PLAYBACK_POSITION_KEY);
            if (posRaw) {
              try {
                const saved = JSON.parse(posRaw);
                if (
                  saved.songId === foundSong.id &&
                  typeof saved.timestamp === "number" &&
                  saved.timestamp >= 0 &&
                  saved.timestamp < foundSong.duration
                ) {
                  restorePositionRef.current = saved.timestamp;
                }
              } catch {
                /* ignore */
              }
            }
            setCurrentSong(foundSong);
            markSongSeen(foundSong.id);
          }
        }
      } catch (err) {
        console.error("[Player] Error restoring last played song:", err);
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

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      )
        return;

      if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (currentSongRef.current) togglePlay();
        return;
      }

      switch (e.code) {
        case "ArrowRight":
          if (audioRef.current && currentSongRef.current) {
            e.preventDefault();
            seekTo(
              Math.min(
                currentSongRef.current.duration,
                audioRef.current.currentTime + 5,
              ),
            );
          }
          break;
        case "ArrowLeft":
          if (audioRef.current) {
            e.preventDefault();
            seekTo(Math.max(0, audioRef.current.currentTime - 5));
          }
          break;
        case "KeyM":
          if (!e.repeat) {
            e.preventDefault();
            setIsMuted((v) => !v);
          }
          break;
        case "KeyQ":
          if (!e.repeat) {
            e.preventDefault();
            setShowQueue((v) => !v);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [togglePlay, seekTo]);

  // ─── Media Session (lock screen / OS controls) ─────────────────────────────

  useMediaSession({
    song: currentSong,
    isPlaying,
    currentTime,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onNext: nextSong,
    onPrev: prevSong,
    onSeek: seekTo,
  });

  // ─── Derived helpers ───────────────────────────────────────────────────────

  const getRecentlyPlayed = useCallback(
    (): Song[] => (session?.user?.id ? recentlyPlayedSongs : []),
    [session?.user?.id, recentlyPlayedSongs],
  );

  // ─── Context value (stable shape) ─────────────────────────────────────────

  const value = useMemo<PlayerContextType>(
    () => ({
      // State
      currentSong,
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
      openMobileLyricsTab,
      volume,
      isMuted,
      isShuffled,
      repeatMode,
      radioMode,
      radioSeedSongId,
      isFetchingRadio,
      currentSongLyrics,
      isLoadingLyrics,
      playbackRate,
      sleepTimer,
      audioRef,

      // Playback
      playSong,
      playFromContext,
      togglePlay,
      nextSong,
      prevSong,
      seekTo,
      setPlaybackRate,

      // Queue
      addToQueue,
      playNextInQueue,
      removeFromQueue,
      reorderUpNext,
      clearQueue,
      startRadio,
      isSongQueued,

      // Controls
      setVolume,
      setIsMuted,
      setIsShuffled: handleSetIsShuffled,
      setRepeatMode,
      setRadioMode: handleSetRadioMode,

      // UI
      setShowLyrics,
      setShowFullscreenLyrics,
      setShowNowPlaying,
      setOpenMobileLyricsTab,
      setShowQueue,
      requestCurrentSongLyrics,

      // Misc
      setSleepTimer,
      getRecentlyPlayed,
      setIsPremium,

      // Raw setters
      setCurrentSong,
      setIsPlaying,
      setCurrentTime,
      setQueue,
    }),
    [
      currentSong,
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
      openMobileLyricsTab,
      volume,
      isMuted,
      isShuffled,
      repeatMode,
      radioMode,
      radioSeedSongId,
      isFetchingRadio,
      currentSongLyrics,
      isLoadingLyrics,
      playbackRate,
      sleepTimer,
      playSong,
      playFromContext,
      togglePlay,
      nextSong,
      prevSong,
      seekTo,
      setPlaybackRate,
      addToQueue,
      playNextInQueue,
      removeFromQueue,
      reorderUpNext,
      clearQueue,
      startRadio,
      isSongQueued,
      handleSetIsShuffled,
      handleSetRadioMode,
      requestCurrentSongLyrics,
      setSleepTimer,
      getRecentlyPlayed,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
