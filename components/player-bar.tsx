"use client";

import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireLoginRedirect } from "@/lib/require-login";
import { useToggleLikeSong } from "@/lib/swr";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Heart,
  ListMusic,
  Radio,
  Maximize2,
  Mic2,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { usePlayer } from "./player-context";
import { AlbumMetadata } from "@/components/album-metadata";
import { ShareButton } from "@/components/share-button";

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
  const {
    volume,
    isMuted,
    setVolume,
    setIsMuted,
    isShuffled,
    setIsShuffled,
    repeatMode,
    setRepeatMode,
    upNext,
    radioMode,
    setShowQueue,
    showQueue,
  } = usePlayer();

  const nextUp = upNext[0]?.song;
  const { isLiked, toggleLike } = useToggleLikeSong({
    enabled: !!session?.user?.id,
  });

  const handleToggleLike = () => {
    if (!currentSong) return;

    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "save");
      return;
    }

    void toggleLike(currentSong);
  };

  const songIsLiked = currentSong ? isLiked(currentSong.id) : false;

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
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 w-72 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onOpenFullscreenLyrics}
                    aria-label="Open fullscreen lyrics"
                    className="relative group shrink-0 size-14 overflow-hidden rounded-lg shadow-lg ring-1 ring-primary/25 transition-all hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Image
                      src={
                        currentSong.albumCoverUrl ||
                        currentSong.coverUrl ||
                        "/placeholder.svg"
                      }
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Maximize2 className="w-5 h-5 text-white" aria-hidden />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Open fullscreen lyrics</TooltipContent>
              </Tooltip>
              <div className="min-w-0">
                <p className="truncate text-foreground leading-loose">
                  {currentSong.title}
                </p>
                <p className="text-xs text-primary/80 truncate leading-loose">
                  {currentSong.artist}
                </p>
                {nextUp && (
                  <p className="text-[10px] text-muted-foreground truncate leading-loose">
                    Up next: {nextUp.title}
                  </p>
                )}
                {!nextUp && radioMode && (
                  <p className="text-[10px] text-muted-foreground truncate leading-loose">
                    Similar songs will follow
                  </p>
                )}
                {/* {currentSong.album && (
                  <AlbumMetadata
                    name={currentSong.album}
                    type={currentSong.albumType}
                    className="text-xs text-muted-foreground truncate leading-loose"
                  />
                )} */}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={handleToggleLike}
                    aria-pressed={songIsLiked}
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4 transition-colors",
                        songIsLiked && "fill-primary text-primary",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!session?.user?.id
                    ? "Sign in to like songs"
                    : songIsLiked
                      ? "Remove from favorites"
                      : "Add to favorites"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ShareButton
                    payload={{
                      type: "song",
                      slug: currentSong.slug,
                      title: currentSong.title,
                      text: `${currentSong.title} by ${currentSong.artist}`,
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    iconClassName="w-4 h-4"
                  />
                </TooltipTrigger>
                <TooltipContent>Share song</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
                    <AddToPlaylistDialog
                      songId={currentSong.id}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ListMusic className="w-4 h-4" />
                        </Button>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Add to playlist</TooltipContent>
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
                        isShuffled && "text-amber-500",
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
                      className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-stone-900 shadow-lg shadow-primary/25 cursor-pointer"
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
                        repeatMode !== "off" && "text-amber-500",
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
                  className="flex-1 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_.bg-primary]:bg-primary"
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
                      showLyrics && "text-primary bg-primary/10",
                      (!currentSong.lyrics ||
                        currentSong.lyrics.length === 0) &&
                        "opacity-50 cursor-not-allowed",
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
                    className={cn(
                      "text-muted-foreground hover:text-foreground relative",
                      showQueue && "text-primary bg-primary/10",
                    )}
                    onClick={() => setShowQueue(!showQueue)}
                  >
                    <ListMusic className="w-4 h-4" />
                    {radioMode && (
                      <Radio className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Queue (Q)</TooltipContent>
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
