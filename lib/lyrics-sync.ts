import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

export const SYNC_LEAD_SECONDS = 0.12;

export function findLyricIndexByTime(times: number[], time: number): number {
  if (!times.length) return -1;

  let lo = 0;
  let hi = times.length - 1;
  let result = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= time) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Return first occurrence of that time for stable duplicate handling
  if (result > 0 && times[result] === times[result - 1]) {
    while (result > 0 && times[result - 1] === times[result]) result--;
  }

  return result === -1 ? 0 : result;
}

function getLyricTimes(lyrics: { time?: number }[]) {
  const times = lyrics.map((l) => Math.max(0, l.time ?? 0));
  // Ensure sorted — binary search requires monotonic times; data-transform preserves API order which is already sorted but be defensive
  for (let i = 1; i < times.length; i++) {
    if (times[i] < times[i - 1]) {
      const sorted = [...times].sort((a, b) => a - b);
      return sorted;
    }
  }
  return times;
}

function getPlaybackTime(
  currentTime: number,
  audioRef: RefObject<HTMLAudioElement | null>,
  pendingSeekTime: number | null,
): number {
  if (pendingSeekTime !== null) return pendingSeekTime;
  return audioRef.current?.currentTime ?? currentTime;
}

function isSeekEvent(
  prevTime: number,
  currentTime: number,
  audioTime: number,
): boolean {
  const timeDelta = currentTime - prevTime;

  // Ignore huge backward jumps on natural track change (180 -> 0 handled separately via trackKey)
  if (Math.abs(timeDelta) > 1.5) return true;
  if (timeDelta < -0.5) return true;

  // Smaller nudges are seeks — don't require audioTime divergence (audio may have already synced)
  if (Math.abs(timeDelta) > 0.3) return true;

  return false;
}

function computeLyricIndex(
  lyricTimes: number[],
  currentTime: number,
  audioRef: RefObject<HTMLAudioElement | null>,
  pendingSeekTime: number | null,
): number {
  const playbackTime = getPlaybackTime(
    currentTime,
    audioRef,
    pendingSeekTime,
  );
  return findLyricIndexByTime(
    lyricTimes,
    Math.max(0, playbackTime + SYNC_LEAD_SECONDS),
  );
}

export function useSyncedLyrics(
  lyrics: { time?: number }[],
  currentTime: number,
  audioRef: RefObject<HTMLAudioElement | null>,
  trackKey?: string,
) {
  const lyricTimes = useMemo(() => getLyricTimes(lyrics), [lyrics]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [seekToken, setSeekToken] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const currentTimeRef = useRef(currentTime);
  const prevCurrentTimeRef = useRef(currentTime);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const lyricTimesRef = useRef(lyricTimes);

  currentTimeRef.current = currentTime;
  lyricTimesRef.current = lyricTimes;

  const syncFromPlayback = () => {
    if (!lyricTimesRef.current.length) return;

    const nextIndex = computeLyricIndex(
      lyricTimesRef.current,
      currentTimeRef.current,
      audioRef,
      pendingSeekTimeRef.current,
    );

    setCurrentLyricIndex((prev) => (prev === nextIndex ? prev : nextIndex));
  };

  // On mount / song change: sync index to playback (runs before lyrics scroll)
  // Use trackKey as single source of truth for "new song" to avoid double seekToken bump
  const lastTrackKeyRef = useRef(trackKey);
  useLayoutEffect(() => {
    const trackChanged = trackKey !== lastTrackKeyRef.current;
    lastTrackKeyRef.current = trackKey;
    pendingSeekTimeRef.current = null;
    prevCurrentTimeRef.current = currentTimeRef.current;

    if (!lyrics.length) {
      setCurrentLyricIndex(lyrics.length === 0 ? -1 : 0);
      if (trackChanged) setSeekToken((token) => token + 1);
      return;
    }

    const nextIndex = computeLyricIndex(
      lyricTimes,
      currentTimeRef.current,
      audioRef,
      null,
    );
    setCurrentLyricIndex(nextIndex);
    if (trackChanged) setSeekToken((token) => token + 1);
  }, [lyrics, lyricTimes, audioRef, trackKey]);

  useEffect(() => {
    if (!lyrics.length) return;

    const prevTime = prevCurrentTimeRef.current;
    prevCurrentTimeRef.current = currentTime;

    // Don't treat track-change 180->0 as seek if we already handled it via trackKey
    const isTrackChangeReset = prevTime > 10 && currentTime < 1;
    if (isTrackChangeReset) {
      syncFromPlayback();
      return;
    }

    const audioTime = audioRef.current?.currentTime ?? currentTime;
    const seeked = isSeekEvent(prevTime, currentTime, audioTime);

    if (seeked) {
      pendingSeekTimeRef.current = currentTime;
      setSeekToken((token) => token + 1);
    }

    syncFromPlayback();
  }, [currentTime, lyrics.length, audioRef]);

  // Continuous sync while playing — only when audio exists and not paused
  useEffect(() => {
    if (!lyrics.length) return;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      animationFrameRef.current = requestAnimationFrame(tick);

      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      if (pendingSeekTimeRef.current !== null) {
        // Tighter threshold and require stable convergence for 2 frames
        if (Math.abs(audio.currentTime - pendingSeekTimeRef.current) < 0.12) {
          pendingSeekTimeRef.current = null;
        }
      }

      const nextIndex = computeLyricIndex(
        lyricTimesRef.current,
        currentTimeRef.current,
        audioRef,
        pendingSeekTimeRef.current,
      );

      setCurrentLyricIndex((prev) =>
        prev === nextIndex ? prev : nextIndex,
      );
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [lyrics.length, audioRef]);

  return { currentLyricIndex, seekToken };
}
