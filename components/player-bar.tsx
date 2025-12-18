"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  ListMusic,
  Mic2,
  Maximize2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePlayer } from "./player-context";
import { useLikedSongs, likeSong, unlikeSong } from "@/lib/swr";

interface PlayerBarProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTimeChange: (time: number) => void;
  showLyrics: boolean;
  onToggleLyrics: () => void;
  isPremium: boolean;
  onOpenFullscreenLyrics?: () => void;
}

export function PlayerBar({
  currentSong,
  isPlaying,
  currentTime,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
  showLyrics,
  onToggleLyrics,
  isPremium,
  onOpenFullscreenLyrics,
}: PlayerBarProps) {
  const { data: session } = useSession();
  const { volume, isMuted, setVolume, setIsMuted } = usePlayer();
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // Fetch liked songs from database
  const { likedSongIds, mutate: mutateLikedSongs } = useLikedSongs({
    enabled: !!session?.user?.id,
  });

  const isLiked = currentSong ? likedSongIds.has(currentSong.id) : false;

  const handleToggleLike = async () => {
    if (!currentSong || !session?.user?.id || isLikeLoading) return;

    setIsLikeLoading(true);
    try {
      if (isLiked) {
        await unlikeSong(currentSong.id);
      } else {
        await likeSong(currentSong.id);
      }
      mutateLikedSongs();
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (value: number[]) => {
    onTimeChange(value[0]);
  };

  const cycleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  if (!currentSong) return null;

  return (
    <TooltipProvider>
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-gradient-to-t from-stone-950 to-stone-900/95 backdrop-blur-xl border-t border-amber-900/20 z-50 hidden md:block">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 w-72 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative group cursor-pointer"
                    onClick={onOpenFullscreenLyrics}
                  >
                    <Image
                      src={
                        currentSong.albumCoverUrl ||
                        currentSong.coverUrl ||
                        "/placeholder.svg"
                      }
                      alt={currentSong.title}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-lg object-cover shadow-lg ring-1 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all"
                      unoptimized
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Open fullscreen lyrics</TooltipContent>
              </Tooltip>
              <div className="min-w-0">
                <p className="font-medium truncate text-foreground">
                  {currentSong.title}
                </p>
                <p className="text-sm text-amber-500/70 truncate">
                  {currentSong.artist}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleToggleLike}
                    disabled={!session?.user?.id || isLikeLoading}
                  >
                    {isLikeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Heart
                        className={cn(
                          "w-4 h-4",
                          isLiked && "fill-amber-500 text-amber-500"
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!session?.user?.id
                    ? "Sign in to like songs"
                    : isLiked
                    ? "Remove from favorites"
                    : "Add to favorites"}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 max-w-xl mx-auto">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-muted-foreground hover:text-foreground",
                        isShuffled && "text-amber-500"
                      )}
                      onClick={() => setIsShuffled(!isShuffled)}
                    >
                      <Shuffle className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isShuffled ? "Disable shuffle" : "Enable shuffle"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onPrev}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <SkipBack className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous song</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-lg shadow-amber-500/25 cursor-pointer"
                      onClick={onTogglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPlaying ? "Pause" : "Play"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onNext}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next song</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-muted-foreground hover:text-foreground relative",
                        repeatMode !== "off" && "text-amber-500"
                      )}
                      onClick={cycleRepeat}
                    >
                      <Repeat className="w-4 h-4" />
                      {repeatMode === "one" && (
                        <span className="absolute text-[8px] font-bold">1</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {repeatMode === "off"
                      ? "Enable repeat"
                      : repeatMode === "all"
                      ? "Repeat all"
                      : "Repeat one"}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="w-full flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10 text-right font-mono">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={currentSong.duration}
                  step={1}
                  onValueChange={handleSeek}
                  className="flex-1 [&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-0 [&_.bg-primary]:bg-amber-500"
                />
                <span className="text-xs text-muted-foreground w-10 font-mono">
                  {formatTime(currentSong.duration)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-72 justify-end shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={
                      !currentSong.lyrics || currentSong.lyrics.length === 0
                    }
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      showLyrics && "text-amber-500 bg-amber-500/10",
                      (!currentSong.lyrics ||
                        currentSong.lyrics.length === 0) &&
                        "opacity-50 cursor-not-allowed"
                    )}
                    onClick={onToggleLyrics}
                  >
                    <Mic2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!currentSong.lyrics || currentSong.lyrics.length === 0
                    ? "No lyrics available"
                    : showLyrics
                    ? "Hide lyrics"
                    : "Show lyrics"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ListMusic className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Queue</TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2 w-32">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isMuted || volume === 0 ? "Unmute" : "Mute"} ({volume}%)
                  </TooltipContent>
                </Tooltip>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setVolume(v[0]);
                    setIsMuted(false);
                  }}
                  className="flex-1 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 cursor-pointer"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenFullscreenLyrics}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fullscreen lyrics</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
