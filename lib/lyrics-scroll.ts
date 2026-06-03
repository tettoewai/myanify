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

interface UseLyricsAutoScrollOptions {
  currentLyricIndex: number;
  seekToken: number;
  lyrics: unknown[];
  enabled?: boolean;
  anchorRatio?: number;
}

export function useLyricsAutoScroll({
  currentLyricIndex,
  seekToken,
  lyrics,
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
  const lastScrolledIndexRef = useRef(0);

  const scrollActiveLineIntoView = useCallback(
    (lineIndex: number) => {
      const container = containerRef.current;
      if (!container) return;

      const prevIndex = lastScrolledIndexRef.current;
      if (lineIndex === prevIndex) return;

      if (scrollRaf.current) {
        cancelAnimationFrame(scrollRaf.current);
      }

      scrollRaf.current = requestAnimationFrame(() => {
        const lines =
          container.querySelectorAll<HTMLElement>("[data-lyric-line]");
        const targetLine = lines[lineIndex];
        if (!targetLine) return;

        isAutoScrollingRef.current = true;

        const delta = lineIndex - prevIndex;

        if (Math.abs(delta) === 1 && prevIndex >= 0 && lines[prevIndex]) {
          const fromLine = lines[prevIndex];
          const step =
            getLineTopInContainer(targetLine, container) -
            getLineTopInContainer(fromLine, container);

          container.scrollTo({
            top: container.scrollTop + step,
            behavior: "smooth",
          });
        } else {
          scrollLineToAnchor(container, targetLine, anchorRatio, "smooth");
        }

        lastScrolledIndexRef.current = lineIndex;

        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
        }
        autoScrollTimeoutRef.current = setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, LYRIC_SCROLL_DURATION_MS);
      });
    },
    [anchorRatio],
  );

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
      }, 2000);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    lastScrolledIndexRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [lyrics]);

  useLayoutEffect(() => {
    if (seekToken > 0) {
      lastScrolledIndexRef.current = -1;
      isUserScrollingRef.current = false;
    }
  }, [seekToken]);

  useLayoutEffect(() => {
    if (!enabled || !containerRef.current || isUserScrollingRef.current) return;

    const scrollToActive = () => {
      if (!containerRef.current || isUserScrollingRef.current) return;
      scrollActiveLineIntoView(currentLyricIndex);
    };

    if (activeRef.current) {
      scrollToActive();
      return;
    }

    // Refs may not be attached on the first layout pass after mount
    scrollRaf.current = requestAnimationFrame(scrollToActive);
  }, [
    currentLyricIndex,
    seekToken,
    enabled,
    scrollActiveLineIntoView,
  ]);

  useEffect(
    () => () => {
      if (scrollRaf.current) {
        cancelAnimationFrame(scrollRaf.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    },
    [],
  );

  return { containerRef, activeRef } satisfies {
    containerRef: RefObject<HTMLDivElement | null>;
    activeRef: RefObject<HTMLDivElement | null>;
  };
}
