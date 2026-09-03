"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Drawer } from "vaul";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ChevronDown,
  MoreHorizontal,
  Repeat,
  Shuffle,
  ListMusic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn, getSongCoverUrl } from "@/lib/utils";
import { usePlayer } from "./player-context";
import { useToggleLikeSong } from "@/lib/swr";
import { requireLoginRedirect } from "@/lib/require-login";
import { findLyricIndexByTime, SYNC_LEAD_SECONDS } from "@/lib/lyrics-sync";
import { ShareButton } from "@/components/share-button";

interface MobilePlayerProps {
  currentSong: Song;
  isPlaying: boolean;
  currentTime: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTimeChange: (time: number) => void;
  onClose: () => void;
}

export function MobilePlayer({
  currentSong,
  isPlaying,
  currentTime,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
  onClose,
}: MobilePlayerProps) {
  const { data: session } = useSession();
  const {
    isShuffled,
    setIsShuffled,
    repeatMode,
    setRepeatMode,
    currentSongLyrics,
    requestCurrentSongLyrics,
  } = usePlayer();
  const [showLyrics, setShowLyrics] = useState(false);

  // Fetch liked songs from database
  const { isLiked, toggleLike } = useToggleLikeSong({
    enabled: !!session?.user?.id,
  });

  const songIsLiked = isLiked(currentSong.id);

  const handleToggleLike = () => {
    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "save");
      return;
    }

    void toggleLike(currentSong);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const lyrics = currentSongLyrics ?? [];

  const handleToggleLyrics = () => {
    setShowLyrics((prev) => {
      const next = !prev;
      if (next) requestCurrentSongLyrics();
      return next;
    });
  };

  const lyricTimes = useMemo(
    () => lyrics.map((l) => Math.max(0, l.time ?? 0)),
    [lyrics],
  );

  const currentLyricIndex = findLyricIndexByTime(
    lyricTimes,
    currentTime + SYNC_LEAD_SECONDS,
  );
  const currentLyric =
    currentLyricIndex >= 0 && currentLyricIndex < lyrics.length
      ? lyrics[currentLyricIndex]
      : undefined;

  return (
    <Drawer.Root open={true} onOpenChange={onClose}>
      <Drawer.Portal>
        <Drawer.Content
          className="fixed inset-0 z-50 bg-background flex flex-col"
          style={{ pointerEvents: "auto" }}
        >
          {/* Drag Handle */}
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mt-3 mb-2" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ChevronDown className="w-6 h-6" />
            </Button>
            <span className="text-sm font-medium">Now Playing</span>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-6 h-6" />
            </Button>
          </div>

          {/* Album Art */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-4 overflow-y-auto">
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl mb-8">
              <Image
                src={getSongCoverUrl(currentSong)}
                alt={currentSong.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Song Info */}
            <div className="w-full max-w-sm text-center mb-4">
              <h2 className="text-2xl font-bold truncate">
                {currentSong.title}
              </h2>
              <p className="text-muted-foreground">{currentSong.artist}</p>
            </div>

            {/* Current Lyric */}
            {showLyrics && currentLyric && (
              <div className="w-full max-w-sm text-center mb-4 p-4 rounded-xl bg-primary/10 overflow-hidden">
                <p
                  key={currentLyricIndex}
                  className="text-base font-medium text-primary leading-loose animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out"
                >
                  {currentLyric.text}
                </p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6 pb-12 space-y-6 shrink-0">
            {/* Progress */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={currentSong.duration}
                step={1}
                onValueChange={(v) => onTimeChange(v[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentSong.duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className={cn(isShuffled && "text-primary")}
                onClick={() => setIsShuffled(!isShuffled)}
              >
                <Shuffle className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onPrev}>
                <SkipBack className="w-8 h-8" />
              </Button>
              <Button
                size="icon"
                className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onNext}>
                <SkipForward className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative",
                  repeatMode !== "off" && "text-primary",
                )}
                onClick={() => {
                  if (repeatMode === "off") setRepeatMode("all");
                  else if (repeatMode === "all") setRepeatMode("one");
                  else setRepeatMode("off");
                }}
              >
                <Repeat className="w-5 h-5" />
                {repeatMode === "one" && (
                  <span className="absolute text-[8px] font-bold">1</span>
                )}
              </Button>
            </div>

            {/* Extra Actions */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handleToggleLike}>
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
                onClick={handleToggleLyrics}
                className={cn(showLyrics && "text-primary")}
              >
                <ListMusic className="w-6 h-6" />
              </Button>
              <ShareButton
                payload={{
                  type: "song",
                  slug: currentSong.slug,
                  title: currentSong.title,
                  text: `${currentSong.title} by ${currentSong.artist}`,
                }}
                iconClassName="w-6 h-6"
              />
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
