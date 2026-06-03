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
  if (!times.length) return 0;

  let lo = 0;
  let hi = times.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] === time) {
      return mid;
    }
    if (times[mid] < time) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return Math.max(0, lo - 1);
}

function getLyricTimes(lyrics: { time?: number }[]) {
  return lyrics.map((l) => Math.max(0, l.time ?? 0));
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

  if (Math.abs(timeDelta) > 1.5) return true;
  if (timeDelta < -0.5) return true;

  return (
    Math.abs(timeDelta) > 0.25 && Math.abs(currentTime - audioTime) >= 1
  );
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

  // On mount / song change: jump to current playback position (not line 0)
  useLayoutEffect(() => {
    pendingSeekTimeRef.current = null;
    prevCurrentTimeRef.current = currentTimeRef.current;

    if (!lyrics.length) {
      setCurrentLyricIndex(0);
      return;
    }

    const nextIndex = computeLyricIndex(
      lyricTimes,
      currentTimeRef.current,
      audioRef,
      null,
    );
    setCurrentLyricIndex(nextIndex);
    setSeekToken((token) => token + 1);
  }, [lyrics, lyricTimes, audioRef]);

  useEffect(() => {
    if (!lyrics.length) return;

    const prevTime = prevCurrentTimeRef.current;
    prevCurrentTimeRef.current = currentTime;

    const audioTime = audioRef.current?.currentTime ?? currentTime;
    const seeked = isSeekEvent(prevTime, currentTime, audioTime);

    if (seeked) {
      pendingSeekTimeRef.current = currentTime;
      setSeekToken((token) => token + 1);
    }

    syncFromPlayback();
  }, [currentTime, lyrics.length, audioRef]);

  // Continuous sync while playing — always reschedule, even if audio isn't ready yet
  useEffect(() => {
    if (!lyrics.length) return;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      animationFrameRef.current = requestAnimationFrame(tick);

      const audio = audioRef.current;
      if (!audio) return;

      if (pendingSeekTimeRef.current !== null) {
        if (Math.abs(audio.currentTime - pendingSeekTimeRef.current) < 0.25) {
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
      }
    };
  }, [lyrics.length, audioRef]);

  return { currentLyricIndex, seekToken };
}
