"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
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
import { requireLoginRedirect } from "@/lib/require-login";
import { useToggleLikeSong } from "@/lib/swr";
import { useSyncedLyrics } from "@/lib/lyrics-sync";
import {
  LYRIC_LINE_TRANSITION,
  LYRIC_TEXT_TRANSITION,
  useLyricsAutoScroll,
} from "@/lib/lyrics-scroll";

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
  const { data: session } = useSession();
  const { audioRef } = usePlayer();
  const [showLyrics, setShowLyrics] = useState(true);

  // Fetch liked songs from database
  const { isLiked, toggleLike } = useToggleLikeSong({
    enabled: !!session?.user?.id,
  });

  const songIsLiked = isLiked(song.id);

  const handleToggleLike = () => {
    if (!session?.user?.id) {
      requireLoginRedirect();
      return;
    }

    void toggleLike(song);
  };

  // Lead slightly so lines flip just ahead of the beat

  const lyrics = useMemo(() => song.lyrics || [], [song.lyrics]);

  const { currentLyricIndex, seekToken } = useSyncedLyrics(
    lyrics,
    currentTime,
    audioRef,
  );

  const { containerRef, activeRef } = useLyricsAutoScroll({
    currentLyricIndex,
    seekToken,
    lyrics,
    enabled: showLyrics,
  });

  const [size, setSize] = useState<"sm" | "md" | "lg">("md");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col leading-loose">
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
          <p className="text-xs uppercase tracking-wider text-amber-400/80 font-medium leading-loose">
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
                "h-8 px-2 text-xs font-semibold rounded-full cursor-pointer leading-loose",
                size === s
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:text-white",
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
            className="flex-1 overflow-y-auto scroll-smooth px-6"
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
                        data-lyric-line
                        ref={isActive ? activeRef : null}
                        className={cn(
                          LYRIC_LINE_TRANSITION,
                          "text-center",
                          isActive && "scale-105",
                          isPast && "opacity-30",
                          !isActive && !isPast && "opacity-50",
                        )}
                      >
                        <p
                          className={cn(
                            LYRIC_TEXT_TRANSITION,
                            "leading-loose font-medium",
                            size === "sm" && "text-sm",
                            size === "md" && "text-lg",
                            size === "lg" && "text-xl md:text-2xl",
                            isActive
                              ? "text-white scale-100"
                              : "text-white/70 scale-[0.98]",
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
                  <p className="text-white/60 leading-loose">
                    No lyrics available
                  </p>
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
                "rounded-full px-4 h-8 text-xs leading-loose",
                !showLyrics ? "bg-white text-stone-900" : "text-white/70",
              )}
            >
              Cover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(true)}
              className={cn(
                "rounded-full px-4 h-8 text-xs leading-loose",
                showLyrics ? "bg-white text-stone-900" : "text-white/70",
              )}
            >
              Lyrics
            </Button>
          </div>
        </div>

        {/* Song info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xl text-white truncate leading-loose">
              {song.title}
            </p>
            <p className="text-amber-400/80 truncate leading-loose">
              {song.artist}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLike}
            disabled={!session?.user?.id}
            aria-pressed={songIsLiked}
            className="text-white/70 hover:text-white rounded-full"
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-colors",
                songIsLiked && "fill-primary text-primary",
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
            <span className="text-xs text-white/50 font-mono leading-loose">
              {formatTime(currentTime)}
            </span>
            <span className="text-xs text-white/50 font-mono leading-loose">
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
            className="text-white/50 hover:text-white text-xs gap-2 leading-loose"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white text-xs gap-2 leading-loose"
          >
            <ListMusic className="w-4 h-4" />
            Queue
          </Button>
        </div>
      </div>
    </div>
  );
}
