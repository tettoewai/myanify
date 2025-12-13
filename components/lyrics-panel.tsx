"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/components/player-context";

interface LyricsPanelProps {
  song: Song;
  currentTime: number;
  onClose: () => void;
}

export function LyricsPanel({ song, currentTime, onClose }: LyricsPanelProps) {
  const { audioRef } = usePlayer();
  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const lastScrollTimeRef = useRef(0);

  const lyrics = useMemo(() => song.lyrics || [], [song.lyrics]);
  const lyricTimes = useMemo(
    () => lyrics.map((l) => Math.max(0, l.time ?? 0)),
    [lyrics]
  );

  // Lead a bit so lines flip slightly before the audio to feel on-beat
  const SYNC_LEAD_SECONDS = 0.12;
  const SCROLL_THROTTLE_MS = 100; // Throttle scroll updates
  const animationFrameRef = useRef<number | null>(null);

  // Track the active line using state so we only re-render when the index changes
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");

  // High-precision time tracking using requestAnimationFrame
  // This gives us 60fps updates instead of 4fps from timeupdate event
  useEffect(() => {
    if (!audioRef.current || !lyrics.length) return;

    const updateLyricIndex = () => {
      if (!audioRef.current) return;

      const preciseTime = audioRef.current.currentTime; // Get precise time (not floored)
      const targetTime = Math.max(0, preciseTime + SYNC_LEAD_SECONDS);
      const nextIndex = findLyricIndexByTime(lyricTimes, targetTime);

      setCurrentLyricIndex((prev) => {
        // Only update state if index actually changed to minimize re-renders
        return prev === nextIndex ? prev : nextIndex;
      });

      animationFrameRef.current = requestAnimationFrame(updateLyricIndex);
    };

    animationFrameRef.current = requestAnimationFrame(updateLyricIndex);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioRef, lyrics.length, lyricTimes]);

  // Smooth scroll function using manual calculation
  const smoothScrollToElement = useCallback(
    (element: HTMLElement, container: HTMLElement) => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
        return; // Throttle scroll updates
      }
      lastScrollTimeRef.current = now;

      if (scrollRaf.current) {
        cancelAnimationFrame(scrollRaf.current);
      }

      scrollRaf.current = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const containerScrollTop = container.scrollTop;
        const elementRelativeTop = elementRect.top - containerRect.top;
        const scrollOffset =
          elementRelativeTop +
          containerScrollTop -
          containerRect.height / 2 +
          elementRect.height / 2;

        // Use smooth scroll behavior
        container.scrollTo({
          top: scrollOffset,
          behavior: "smooth",
        });
      });
    },
    []
  );

  // Set up IntersectionObserver to detect when active lyric is visible
  useEffect(() => {
    if (!activeRef.current || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If the active lyric is not visible and user is not scrolling, scroll to it
          if (
            !entry.isIntersecting &&
            !isUserScrollingRef.current &&
            activeRef.current &&
            containerRef.current
          ) {
            smoothScrollToElement(activeRef.current, containerRef.current);
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: "-40% 0px -40% 0px", // Only trigger if not in center 40% of viewport
        threshold: 0.5,
      }
    );

    if (activeRef.current) {
      observer.observe(activeRef.current);
    }

    intersectionObserverRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [currentLyricIndex, smoothScrollToElement]);

  // Handle user scrolling - disable auto-scroll temporarily
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isUserScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 2000); // Re-enable auto-scroll after 2 seconds of no scrolling
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Note: Lyric index is now updated via requestAnimationFrame above for better performance

  // Ensure we reset when song changes
  useEffect(() => {
    setCurrentLyricIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [lyrics]);

  // Scroll to active lyric when index changes (only if not user scrolling)
  useEffect(() => {
    if (
      activeRef.current &&
      containerRef.current &&
      !isUserScrollingRef.current
    ) {
      smoothScrollToElement(activeRef.current, containerRef.current);
    }
  }, [currentLyricIndex, smoothScrollToElement]);

  useEffect(
    () => () => {
      if (scrollRaf.current) {
        cancelAnimationFrame(scrollRaf.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    },
    []
  );

  return (
    <aside className="w-80 lg:w-[420px] h-full bg-linear-to-b from-amber-950/20 via-background to-background border-l border-amber-900/20 flex-col hidden lg:flex">
      <div className="p-5 border-b border-amber-900/20 flex items-center justify-between bg-linear-to-r from-amber-900/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Music2 className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Lyrics</h2>
            <p className="text-xs text-muted-foreground">Synced with music</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-amber-900/30 bg-amber-900/10 px-1 py-0.5">
            {(["sm", "md", "lg"] as const).map((s) => (
              <Button
                key={s}
                variant={size === s ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 px-2 text-xs font-medium cursor-pointer",
                  size === s
                    ? "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSize(s)}
              >
                {s.toUpperCase()}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-5 border-b border-amber-900/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={song.albumCoverUrl || song.coverUrl || "/placeholder.svg"}
              alt={song.title}
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-cover shadow-xl ring-2 ring-amber-500/20"
              unoptimized
            />
            <div className="absolute inset-0 rounded-xl bg-linear-to-t from-black/40 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg truncate text-foreground">
              {song.title}
            </p>
            <p className="text-sm text-amber-500/80 truncate">{song.artist}</p>
            <p className="text-xs text-muted-foreground mt-1">{song.album}</p>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/30 scrollbar-track-transparent"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="py-8 px-6">
          {lyrics.length > 0 ? (
            <div className="space-y-8">
              {lyrics.map((line, index) => {
                const isActive = index === currentLyricIndex;
                const isPast = index < currentLyricIndex;
                const isFuture = index > currentLyricIndex;

                return (
                  <div
                    key={index}
                    ref={isActive ? activeRef : null}
                    className={cn(
                      "transition-all duration-500 ease-out relative group cursor-pointer",
                      isActive && "scale-100 will-change-transform",
                      isPast && "opacity-40",
                      isFuture && "opacity-60"
                    )}
                    style={
                      isActive
                        ? { willChange: "transform, opacity" }
                        : undefined
                    }
                  >
                    {/* Active indicator line */}
                    {isActive && (
                      <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full bg-linear-to-b from-amber-400 via-amber-500 to-amber-600 shadow-lg shadow-amber-500/50" />
                    )}

                    {/* Lyric text */}
                    <p
                      className={cn(
                        "leading-relaxed transition-all duration-500 font-medium",
                        size === "sm" && "text-base",
                        size === "md" && "text-xl",
                        size === "lg" && "text-2xl",
                        isActive
                          ? "text-amber-400"
                          : isPast
                          ? "text-muted-foreground"
                          : "text-foreground/80"
                      )}
                    >
                      {line.text}
                    </p>

                    {/* Subtle glow effect for active lyric */}
                    {isActive && (
                      <div className="absolute -inset-4 bg-amber-500/5 rounded-2xl -z-10 blur-xl" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-900/20 flex items-center justify-center mb-4">
                <Music2 className="w-10 h-10 text-amber-500/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                No lyrics available
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Lyrics for this song haven't been added yet
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-amber-900/20 bg-linear-to-t from-amber-950/10 to-transparent">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Auto-scrolling to current lyric</span>
        </div>
      </div>
    </aside>
  );
}

function formatTimestamp(time: number) {
  const clamped = Math.max(0, time);
  const minutes = Math.floor(clamped / 60);
  const secondsFloat = clamped - minutes * 60;
  const seconds = Math.floor(secondsFloat);
  const millis = Math.floor((secondsFloat - seconds) * 1000);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  // Include millis when present for tighter sync, otherwise keep clean mm:ss
  if (millis > 0) {
    return `${mm}:${ss}.${String(millis).padStart(3, "0")}`;
  }

  return `${mm}:${ss}`;
}

function findLyricIndexByTime(times: number[], time: number) {
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
