"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Heart,
  Loader2,
  Pause,
  Play,
  Repeat,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { usePlayer } from "@/components/player-context";
import { requireLoginRedirect } from "@/lib/require-login";
import { useLikedSongs, likeSong, unlikeSong } from "@/lib/swr";

interface FullscreenLyricsProps {
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

export function FullscreenLyrics({
  song,
  currentTime,
  isPlaying,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
}: FullscreenLyricsProps) {
  const { data: session } = useSession();
  const { audioRef, isShuffled, setIsShuffled, repeatMode, setRepeatMode } =
    usePlayer();
  const activeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef(0);

  // Fetch liked songs from database
  const { likedSongIds, mutate: mutateLikedSongs } = useLikedSongs({
    enabled: !!session?.user?.id,
  });

  const isLiked = likedSongIds.has(song.id);

  const handleToggleLike = async () => {
    if (isLikeLoading) return;

    if (!session?.user?.id) {
      requireLoginRedirect();
      return;
    }

    setIsLikeLoading(true);
    try {
      if (isLiked) {
        await unlikeSong(song.id);
      } else {
        await likeSong(song.id);
      }
      mutateLikedSongs();
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Lead a bit so lines flip slightly before the beat to feel on-time
  const SYNC_LEAD_SECONDS = 0.12;
  const SCROLL_THROTTLE_MS = 100;

  const lyrics = useMemo(() => song.lyrics || [], [song.lyrics]);
  const lyricTimes = useMemo(
    () => lyrics.map((l) => Math.max(0, l.time ?? 0)),
    [lyrics]
  );

  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [isMobile, setIsMobile] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Smooth scroll function to center the current lyric
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
        // Center the element vertically in the container
        const scrollOffset =
          elementRelativeTop +
          containerScrollTop -
          containerRect.height / 2 +
          elementRect.height / 2;

        container.scrollTo({
          top: Math.max(0, scrollOffset),
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
      !isUserScrollingRef.current
    ) {
      smoothScrollToElement(activeRef.current, containerRef.current);
    }
  }, [currentLyricIndex, smoothScrollToElement]);

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
    <div className="fixed inset-0 z-100 bg-linear-to-br from-amber-950 via-stone-950 to-stone-900 flex flex-col">
      {/* Background blur effect with album art */}
      <div
        className="absolute inset-0 opacity-30 blur-3xl scale-110"
        style={{
          backgroundImage: `url(${
            song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 md:p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
        >
          <ChevronDown className="w-6 h-6" />
        </Button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-amber-400/80 font-medium">
            Now Playing
          </p>
          <p className="text-sm text-white/60 mt-0.5">{song.album}</p>
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

      {/* Lyrics area */}
      <div
        ref={containerRef}
        className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 lg:px-24"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="max-w-3xl mx-auto">
          {song.lyrics.length > 0 ? (
            <div className="space-y-12">
              {/* Mobile: show all lyrics, Desktop: show only 3 lyrics */}
              {isMobile ? (
                // Mobile view: show all lyrics
                <>
                  <div className="h-[calc(30vh)] min-h-[1px]" />
                  {song.lyrics.map((line, index) => {
                    const isActive = index === currentLyricIndex;
                    const isPast = index < currentLyricIndex;

                    return (
                      <div
                        key={index}
                        ref={isActive ? activeRef : null}
                        className={cn(
                          "transition-all duration-700 ease-out text-center",
                          isActive && "scale-105 will-change-transform",
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
                            "leading-relaxed font-medium transition-all duration-700",
                            size === "sm" && "text-xl md:text-2xl lg:text-3xl",
                            size === "md" && "text-2xl md:text-4xl lg:text-5xl",
                            size === "lg" && "text-3xl md:text-5xl lg:text-6xl",
                            isActive
                              ? "text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                              : "text-white/70"
                          )}
                        >
                          {line.text}
                        </p>
                      </div>
                    );
                  })}
                  <div className="h-[calc(30vh)] min-h-[1px]" />
                </>
              ) : (
                // Desktop view: show only 3 lyrics (previous, current, next)
                (() => {
                  const prevIndex = Math.max(0, currentLyricIndex - 1);
                  const nextIndex = Math.min(
                    song.lyrics.length - 1,
                    currentLyricIndex + 1
                  );

                  // Determine which 3 lyrics to show
                  let indicesToShow: number[] = [];

                  if (currentLyricIndex === 0) {
                    // At the start: show current, next, next+1
                    indicesToShow = [
                      currentLyricIndex,
                      Math.min(song.lyrics.length - 1, currentLyricIndex + 1),
                      Math.min(song.lyrics.length - 1, currentLyricIndex + 2),
                    ];
                  } else if (currentLyricIndex === song.lyrics.length - 1) {
                    // At the end: show prev-1, prev, current
                    indicesToShow = [
                      Math.max(0, currentLyricIndex - 2),
                      Math.max(0, currentLyricIndex - 1),
                      currentLyricIndex,
                    ];
                  } else {
                    // In the middle: show prev, current, next
                    indicesToShow = [prevIndex, currentLyricIndex, nextIndex];
                  }

                  return (
                    <>
                      <div className="h-[calc(50vh-12rem)] min-h-[1px]" />
                      {indicesToShow.map((index) => {
                        const line = song.lyrics[index];
                        const isActive = index === currentLyricIndex;
                        const isPast = index < currentLyricIndex;

                        return (
                          <div
                            key={`${index}-${currentLyricIndex}`}
                            ref={isActive ? activeRef : null}
                            className={cn(
                              "transition-all duration-700 ease-out text-center",
                              isActive && "scale-105 will-change-transform",
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
                                "leading-relaxed font-medium transition-all duration-700",
                                size === "sm" &&
                                  "text-xl md:text-2xl lg:text-3xl",
                                size === "md" &&
                                  "text-2xl md:text-4xl lg:text-5xl",
                                size === "lg" &&
                                  "text-3xl md:text-5xl lg:text-6xl",
                                isActive
                                  ? "text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                                  : "text-white/70"
                              )}
                            >
                              {line.text}
                            </p>
                          </div>
                        );
                      })}
                      <div className="h-[calc(50vh-12rem)] min-h-[1px]" />
                    </>
                  );
                })()
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-white/60 text-xl">
                No lyrics available for this song
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 p-6 md:p-8 bg-linear-to-t from-black/80 to-transparent">
        <div className="max-w-2xl mx-auto">
          {/* Song info */}
          <div className="flex items-center gap-4 mb-6">
            <Image
              src={song.albumCoverUrl || song.coverUrl || "/placeholder.svg"}
              alt={song.title}
              width={80}
              height={80}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shadow-2xl ring-2 ring-white/10"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl md:text-2xl text-white truncate">
                {song.title}
              </p>
              <p className="text-amber-400/80 truncate">{song.artist}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleLike}
                disabled={!session?.user?.id || isLikeLoading}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                {isLikeLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Heart
                    className={cn(
                      "w-6 h-6",
                      isLiked && "fill-amber-400 text-amber-400"
                    )}
                  />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-white/60 w-10 text-right font-mono">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={song.duration}
              step={1}
              onValueChange={(v) => onTimeChange(v[0])}
              className="flex-1 **:[[role=slider]]:bg-white **:[[role=slider]]:border-0 [&_.bg-primary]:bg-amber-400"
            />
            <span className="text-xs text-white/60 w-10 font-mono">
              {formatTime(song.duration)}
            </span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShuffled(!isShuffled)}
              className={cn(
                "text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10",
                isShuffled && "text-amber-400"
              )}
            >
              <Shuffle className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-4 md:gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
              >
                <SkipBack className="w-6 h-6" />
              </Button>
              <Button
                size="icon"
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-white hover:bg-white/90 text-stone-900 shadow-xl shadow-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-1" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (repeatMode === "off") setRepeatMode("all");
                else if (repeatMode === "all") setRepeatMode("one");
                else setRepeatMode("off");
              }}
              className={cn(
                "relative text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10",
                repeatMode !== "off" && "text-amber-400"
              )}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === "one" && (
                <span className="absolute text-[8px] font-bold">1</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
