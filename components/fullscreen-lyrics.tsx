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
  Pause,
  Play,
  Repeat,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePlayer } from "@/components/player-context";
import { requireLoginRedirect } from "@/lib/require-login";
import { useToggleLikeSong } from "@/lib/swr";
import { AlbumMetadata } from "@/components/album-metadata";
import { useSyncedLyrics } from "@/lib/lyrics-sync";
import {
  LYRIC_LINE_TRANSITION,
  LYRIC_TEXT_TRANSITION,
  useLyricsAutoScroll,
} from "@/lib/lyrics-scroll";

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

  // Lead a bit so lines flip slightly before the beat to feel on-time

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
  });

  const [size, setSize] = useState<"sm" | "md" | "lg">("md");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-100 bg-linear-to-br from-amber-950 via-stone-950 to-stone-900 flex flex-col leading-loose">
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
          <p className="text-xs uppercase tracking-wider text-primary font-medium leading-loose">
            Now Playing
          </p>
          <AlbumMetadata
            name={song.album}
            type={song.albumType}
            className="text-sm text-white/60 mt-0.5 leading-loose"
          />
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

      {/* Lyrics area */}
      <div
        ref={containerRef}
        className="relative z-10 flex-1 overflow-y-auto scroll-smooth px-6 md:px-12 lg:px-24"
      >
        {song.lyrics.length > 0 && (
          <div className="min-h-[50%] shrink-0" aria-hidden />
        )}
        <div className="max-w-3xl mx-auto">
          {song.lyrics.length > 0 ? (
            <div className="space-y-12">
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
                        size === "sm" && "text-lg md:text-xl lg:text-2xl",
                        size === "md" && "text-xl md:text-2xl lg:text-3xl",
                        size === "lg" && "text-2xl md:text-3xl lg:text-4xl",
                        isActive
                          ? "text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.3)] scale-100"
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
              <p className="text-white/60 text-xl leading-loose">
                No lyrics available for this song
              </p>
            </div>
          )}
        </div>
        {song.lyrics.length > 0 && (
          <div className="min-h-[50%] shrink-0" aria-hidden />
        )}
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
              <p className="font-bold text-xl md:text-2xl text-white truncate leading-loose">
                {song.title}
              </p>
              <p className="text-primary truncate leading-loose">
                {song.artist}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleLike}
                disabled={!session?.user?.id}
                aria-pressed={songIsLiked}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                <Heart
                  className={cn(
                    "w-6 h-6 transition-colors",
                    songIsLiked && "fill-primary text-primary",
                  )}
                />
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
            <span className="text-xs text-white/60 w-10 text-right font-mono leading-loose">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={song.duration}
              step={1}
              onValueChange={(v) => onTimeChange(v[0])}
              className="flex-1 **:[[role=slider]]:bg-white **:[[role=slider]]:border-0 [&_.bg-primary]:bg-primary"
            />
            <span className="text-xs text-white/60 w-10 font-mono leading-loose">
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
                isShuffled && "text-primary",
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
                repeatMode !== "off" && "text-primary",
              )}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === "one" && (
                <span className="absolute text-[8px] font-bold leading-loose">
                  1
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
