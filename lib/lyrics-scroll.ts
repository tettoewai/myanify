import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";

export const LYRIC_SCROLL_ANCHOR_RATIO = 0.5;
export const LYRIC_SCROLL_DURATION_MS = 650;
export const LYRIC_LINE_TRANSITION =
  "transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]";
export const LYRIC_TEXT_TRANSITION =
  "transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]";

export function getLineTopInContainer(
  line: HTMLElement,
  container: HTMLElement,
): number {
  return (
    line.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop
  );
}

export function scrollLineToAnchor(
  container: HTMLElement,
  line: HTMLElement,
  anchorRatio = LYRIC_SCROLL_ANCHOR_RATIO,
  behavior: ScrollBehavior = "smooth",
) {
  const lineTop = getLineTopInContainer(line, container);
  const lineHeight = line.getBoundingClientRect().height;
  const anchorOffset = container.clientHeight * anchorRatio - lineHeight / 2;
  container.scrollTo({
    top: Math.max(0, lineTop - anchorOffset),
    behavior,
  });
}

/** Instant scroll reset — bypasses Tailwind scroll-smooth on the container */
export function resetLyricsScrollContainer(container: HTMLElement) {
  const previousBehavior = container.style.scrollBehavior;
  container.style.scrollBehavior = "auto";
  container.scrollTop = 0;
  container.scrollTo({ top: 0, behavior: "auto" });
  container.style.scrollBehavior = previousBehavior;
}

interface UseLyricsAutoScrollOptions {
  currentLyricIndex: number;
  seekToken: number;
  lyrics: unknown[];
  /** Changes when the track changes (e.g. song id) */
  resetKey?: string;
  enabled?: boolean;
  anchorRatio?: number;
}

function clearScrollTimers(
  scrollRaf: { current: number | null },
  scrollTimeoutRef: { current: NodeJS.Timeout | null },
  autoScrollTimeoutRef: { current: ReturnType<typeof setTimeout> | null },
) {
  if (scrollRaf.current) {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = null;
  }
  if (scrollTimeoutRef.current) {
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = null;
  }
  if (autoScrollTimeoutRef.current) {
    clearTimeout(autoScrollTimeoutRef.current);
    autoScrollTimeoutRef.current = null;
  }
}

export function useLyricsAutoScroll({
  currentLyricIndex,
  seekToken,
  lyrics,
  resetKey,
  enabled = true,
  anchorRatio = LYRIC_SCROLL_ANCHOR_RATIO,
}: UseLyricsAutoScrollOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrolledIndexRef = useRef(-1);
  const trackKeyRef = useRef(resetKey);
  const skipAutoScrollPassRef = useRef(false);
  const currentLyricIndexRef = useRef(currentLyricIndex);

  currentLyricIndexRef.current = currentLyricIndex;

  const scrollActiveLineIntoView = useCallback(
    (lineIndex: number, { force = false }: { force?: boolean } = {}) => {
      const container = containerRef.current;
      if (!container) return;

      const prevIndex = lastScrolledIndexRef.current;
      if (!force && lineIndex === prevIndex) return;

      if (scrollRaf.current) {
        cancelAnimationFrame(scrollRaf.current);
      }

      scrollRaf.current = requestAnimationFrame(() => {
        const lines =
          container.querySelectorAll<HTMLElement>("[data-lyric-line]");
        const targetLine = lines[lineIndex];
        if (!targetLine) return;

        isAutoScrollingRef.current = true;
        scrollLineToAnchor(container, targetLine, anchorRatio, "smooth");
        lastScrolledIndexRef.current = lineIndex;

        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
        }
        autoScrollTimeoutRef.current = setTimeout(() => {
          // Re-anchor after scale/opacity transitions settle
          scrollLineToAnchor(container, targetLine, anchorRatio, "auto");
          isAutoScrollingRef.current = false;
        }, LYRIC_SCROLL_DURATION_MS);
      });
    },
    [anchorRatio],
  );

  const scrollActiveLineIntoViewRef = useRef(scrollActiveLineIntoView);
  scrollActiveLineIntoViewRef.current = scrollActiveLineIntoView;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isAutoScrollingRef.current) return;

      isUserScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
        lastScrolledIndexRef.current = -1;
        scrollActiveLineIntoViewRef.current(currentLyricIndexRef.current, {
          force: true,
        });
      }, 1500);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Track change: jump to top before lyric index state catches up
  useLayoutEffect(() => {
    const trackChanged =
      resetKey !== undefined && resetKey !== trackKeyRef.current;

    if (trackChanged) {
      trackKeyRef.current = resetKey;
      skipAutoScrollPassRef.current = true;
    }

    const container = containerRef.current;
    if (container && (trackChanged || lyrics)) {
      resetLyricsScrollContainer(container);
    }

    if (trackChanged) {
      lastScrolledIndexRef.current = -1;
      isUserScrollingRef.current = false;
      isAutoScrollingRef.current = false;
      clearScrollTimers(scrollRaf, scrollTimeoutRef, autoScrollTimeoutRef);
    }
  }, [lyrics, resetKey]);

  useLayoutEffect(() => {
    if (seekToken > 0) {
      lastScrolledIndexRef.current = -1;
      isUserScrollingRef.current = false;
    }
  }, [seekToken]);

  useLayoutEffect(() => {
    if (!enabled || !containerRef.current) return;

    if (skipAutoScrollPassRef.current) {
      skipAutoScrollPassRef.current = false;
      return;
    }

    if (isUserScrollingRef.current) return;

    const scrollToActive = () => {
      if (!containerRef.current || isUserScrollingRef.current) return;
      scrollActiveLineIntoView(currentLyricIndex);
    };

    if (activeRef.current) {
      scrollToActive();
      return;
    }

    scrollRaf.current = requestAnimationFrame(scrollToActive);
  }, [
    currentLyricIndex,
    seekToken,
    enabled,
    scrollActiveLineIntoView,
  ]);

  useEffect(
    () => () => {
      clearScrollTimers(scrollRaf, scrollTimeoutRef, autoScrollTimeoutRef);
    },
    [],
  );

  return { containerRef, activeRef } satisfies {
    containerRef: RefObject<HTMLDivElement | null>;
    activeRef: RefObject<HTMLDivElement | null>;
  };
}
