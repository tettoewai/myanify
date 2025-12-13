"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Heart,
  Share2,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  MoreHorizontal,
  ListMusic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/components/player-context";

interface MobileLyricsViewProps {
  song: Song;
  currentTime: number;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTimeChange: (time: number) => void;
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

export function MobileLyricsView({
  song,
  currentTime,
  isPlaying,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
}: MobileLyricsViewProps) {
  const { audioRef } = usePlayer();
  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef(0);
  const [showLyrics, setShowLyrics] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  // Lead slightly so lines flip just ahead of the beat
  const SYNC_LEAD_SECONDS = 0.12;
  const SCROLL_THROTTLE_MS = 100;

  const lyrics = useMemo(() => song.lyrics || [], [song.lyrics]);
  const lyricTimes = useMemo(
    () => lyrics.map((l) => Math.max(0, l.time ?? 0)),
    [lyrics]
  );

  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");

  // Smooth scroll function
  const smoothScrollToElement = useCallback(
    (element: HTMLElement, container: HTMLElement) => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
        return;
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

        container.scrollTo({
          top: scrollOffset,
          behavior: "smooth",
        });
      });
    },
    []
  );

  // Handle user scrolling
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

  // High-precision time tracking using requestAnimationFrame
  useEffect(() => {
    if (!audioRef.current || !lyrics.length) return;

    const updateLyricIndex = () => {
      if (!audioRef.current) return;

      const preciseTime = audioRef.current.currentTime;
      const targetTime = Math.max(0, preciseTime + SYNC_LEAD_SECONDS);
      const nextIndex = findLyricIndexByTime(lyricTimes, targetTime);

      setCurrentLyricIndex((prev) => {
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

  useEffect(() => {
    setCurrentLyricIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [lyrics]);

  useEffect(() => {
    if (
      activeRef.current &&
      containerRef.current &&
      showLyrics &&
      !isUserScrollingRef.current
    ) {
      smoothScrollToElement(activeRef.current, containerRef.current);
    }
  }, [currentLyricIndex, showLyrics, smoothScrollToElement]);

  useEffect(() => {
    return () => {
      if (scrollRaf.current) {
        cancelAnimationFrame(scrollRaf.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col">
      {/* Background with album art blur */}
      <div
        className="absolute inset-0 opacity-40 blur-3xl scale-125"
        style={{
          backgroundImage: `url(${
            song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-stone-950/80 via-stone-950/60 to-stone-950" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-safe">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
        >
          <ChevronDown className="w-7 h-7" />
        </Button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-amber-400/80 font-medium">
            Now Playing
          </p>
        </div>

        <div className="flex items-center gap-1">
          {(["sm", "md", "lg"] as const).map((s) => (
            <Button
              key={s}
              variant={size === s ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 px-2 text-xs font-semibold rounded-full cursor-pointer",
                size === s
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:text-white"
              )}
              onClick={() => setSize(s)}
            >
              {s.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Main content area - switches between album art and lyrics */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {showLyrics ? (
          /* Lyrics View */
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-6"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="py-[20vh]">
              {song.lyrics.length > 0 ? (
                <div className="space-y-8">
                  {song.lyrics.map((line, index) => {
                    const isActive = index === currentLyricIndex;
                    const isPast = index < currentLyricIndex;

                    return (
                      <div
                        key={index}
                        ref={isActive ? activeRef : null}
                        className={cn(
                          "transition-all duration-500 text-center",
                          isActive && "will-change-transform",
                          isPast && "opacity-30",
                          !isActive && !isPast && "opacity-50"
                        )}
                        style={
                          isActive
                            ? { willChange: "transform, opacity" }
                            : undefined
                        }
                      >
                        <p
                          className={cn(
                            "leading-relaxed font-medium transition-all duration-500",
                            size === "sm" && "text-base",
                            size === "md" && "text-xl",
                            size === "lg" && "text-2xl md:text-3xl",
                            isActive ? "text-white" : "text-white/70"
                          )}
                        >
                          {line.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-white/60">No lyrics available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Album Art View */
          <div className="flex-1 flex items-center justify-center px-12">
            <div className="relative w-full max-w-xs aspect-square">
              <Image
                src={song.albumCoverUrl || song.coverUrl || "/placeholder.svg"}
                alt={song.title}
                fill
                className="rounded-2xl object-cover shadow-2xl"
                unoptimized
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="relative z-10 px-6 pb-safe bg-linear-to-t from-stone-950 to-transparent pt-8">
        {/* Toggle between lyrics and artwork */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center bg-white/10 rounded-full p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(false)}
              className={cn(
                "rounded-full px-4 h-8 text-xs",
                !showLyrics ? "bg-white text-stone-900" : "text-white/70"
              )}
            >
              Cover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(true)}
              className={cn(
                "rounded-full px-4 h-8 text-xs",
                showLyrics ? "bg-white text-stone-900" : "text-white/70"
              )}
            >
              Lyrics
            </Button>
          </div>
        </div>

        {/* Song info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xl text-white truncate">
              {song.title}
            </p>
            <p className="text-amber-400/80 truncate">{song.artist}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLiked(!isLiked)}
            className="text-white/70 hover:text-white rounded-full"
          >
            <Heart
              className={cn(
                "w-6 h-6",
                isLiked && "fill-amber-400 text-amber-400"
              )}
            />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            max={song.duration}
            step={1}
            onValueChange={(v) => onTimeChange(v[0])}
            className="**:[[role=slider]]:bg-white **:[[role=slider]]:border-0 **:[[role=slider]]:w-4 **:[[role=slider]]:h-4 [&_.bg-primary]:bg-amber-400"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-white/50 font-mono">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-white/50 font-mono">
              {formatTime(song.duration)}
            </span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white rounded-full"
          >
            <Shuffle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            className="text-white hover:text-white rounded-full w-12 h-12"
          >
            <SkipBack className="w-7 h-7" />
          </Button>
          <Button
            size="icon"
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-xl shadow-amber-500/30"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="text-white hover:text-white rounded-full w-12 h-12"
          >
            <SkipForward className="w-7 h-7" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white rounded-full"
          >
            <Repeat className="w-5 h-5" />
          </Button>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white text-xs gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white text-xs gap-2"
          >
            <ListMusic className="w-4 h-4" />
            Queue
          </Button>
        </div>
      </div>
    </div>
  );
}
