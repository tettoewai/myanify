"use client";

import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { ShareButton } from "@/components/share-button";
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
import { cn, getSongCoverUrl } from "@/lib/utils";
import {
  Heart,
  ListMusic,
  Maximize2,
  Mic2,
  Pause,
  Play,
  Radio,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { usePlayer } from "./player-context";
import { useState } from "react";

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
    currentSongLyrics,
  } = usePlayer();

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

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
      {/* Desktop Player Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-linear-to-t from-background to-card/95 backdrop-blur-xl border-t border-border/40 z-50 hidden md:block">
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
                      src={getSongCoverUrl(currentSong)}
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
                        isShuffled && "text-primary",
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
                      className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 cursor-pointer"
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
                        repeatMode !== "off" && "text-primary",
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
                  aria-label="Song progress"
                  aria-valuetext={`${formatTime(currentTime)} of ${formatTime(currentSong.duration)}`}
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
                      currentSongLyrics !== undefined &&
                      currentSongLyrics.length === 0
                    }
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      showLyrics && "text-primary bg-primary/10",
                      currentSongLyrics !== undefined &&
                        currentSongLyrics.length === 0 &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    onClick={onToggleLyrics}
                  >
                    <Mic2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {currentSongLyrics !== undefined &&
                  currentSongLyrics.length === 0
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
                  aria-label="Volume"
                  aria-valuetext={`${isMuted ? 0 : volume}%`}
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

      {/* Mobile Player Bar - Collapsed */}
      <div className="fixed bottom-0 left-0 right-0 bg-linear-to-t from-background to-card/95 backdrop-blur-xl border-t border-border/40 z-50 md:hidden">
        {/* Progress bar at top for mobile */}
        <Slider
          value={[currentTime]}
          max={currentSong.duration}
          step={1}
          onValueChange={handleSeek}
          className="absolute -top-2 left-0 right-0 h-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-0"
          aria-label="Song progress"
        />

        {!isMobileExpanded ? (
          // Collapsed mobile view
          <div className="px-3 py-2">
            <div className="flex items-center gap-3">
              {/* Album art */}
              <button
                type="button"
                onClick={() => setIsMobileExpanded(true)}
                className="relative shrink-0 size-10 overflow-hidden rounded-md shadow-md ring-1 ring-primary/25"
              >
                <Image
                  src={getSongCoverUrl(currentSong)}
                  alt=""
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized
                />
              </button>

              {/* Song info */}
              <div
                className="flex-1 min-w-0"
                onClick={() => setIsMobileExpanded(true)}
              >
                <p className="truncate text-sm font-medium text-foreground">
                  {currentSong.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentSong.artist}
                </p>
              </div>

              {/* Like button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground"
                onClick={handleToggleLike}
                aria-pressed={songIsLiked}
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-colors",
                    songIsLiked && "fill-primary text-primary",
                  )}
                />
              </Button>

              {/* Play/Pause */}
              <Button
                size="icon"
                className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Expanded mobile view
          <div className="px-4 py-3">
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Now Playing
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => setIsMobileExpanded(false)}
              >
                <ChevronUp className="w-5 h-5" />
              </Button>
            </div>

            {/* Large album art */}
            <div className="flex justify-center mb-4">
              <div className="relative size-48 overflow-hidden rounded-xl shadow-2xl ring-1 ring-primary/25">
                <Image
                  src={getSongCoverUrl(currentSong)}
                  alt=""
                  fill
                  sizes="192px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>

            {/* Song info */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-foreground truncate px-4">
                {currentSong.title}
              </h2>
              <p className="text-sm text-primary/80 truncate px-4">
                {currentSong.artist}
              </p>
              {nextUp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Up next: {nextUp.title}
                </p>
              )}
              {!nextUp && radioMode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Similar songs will follow
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground w-10 text-right font-mono">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={currentSong.duration}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
                aria-label="Song progress"
              />
              <span className="text-xs text-muted-foreground w-10 font-mono">
                {formatTime(currentSong.duration)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground",
                  isShuffled && "text-primary",
                )}
                onClick={() => setIsShuffled(!isShuffled)}
              >
                <Shuffle className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="text-muted-foreground"
              >
                <SkipBack className="w-6 h-6" />
              </Button>
              <Button
                size="icon"
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="text-muted-foreground"
              >
                <SkipForward className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground relative",
                  repeatMode !== "off" && "text-primary",
                )}
                onClick={cycleRepeat}
              >
                <Repeat className="w-5 h-5" />
                {repeatMode === "one" && (
                  <span className="absolute text-[8px] font-bold">1</span>
                )}
              </Button>
            </div>

            {/* Additional controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleLike}
                  className="text-muted-foreground"
                  aria-pressed={songIsLiked}
                >
                  <Heart
                    className={cn(
                      "w-5 h-5 transition-colors",
                      songIsLiked && "fill-primary text-primary",
                    )}
                  />
                </Button>
                <ShareButton
                  payload={{
                    type: "song",
                    slug: currentSong.slug,
                    title: currentSong.title,
                    text: `${currentSong.title} by ${currentSong.artist}`,
                  }}
                  className="text-muted-foreground"
                  iconClassName="w-5 h-5"
                />
                <AddToPlaylistDialog
                  songId={currentSong.id}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                    >
                      <ListMusic className="w-5 h-5" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={
                    currentSongLyrics !== undefined &&
                    currentSongLyrics.length === 0
                  }
                  className={cn(
                    "text-muted-foreground",
                    showLyrics && "text-primary",
                  )}
                  onClick={onToggleLyrics}
                >
                  <Mic2 className="w-5 h-5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground",
                  showQueue && "text-primary",
                )}
                onClick={() => setShowQueue(!showQueue)}
              >
                <ListMusic className="w-5 h-5" />
              </Button>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2 mt-3 px-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                className="text-muted-foreground"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(v) => {
                  setVolume(v[0]);
                  setIsMuted(false);
                }}
                className="flex-1"
                aria-label="Volume"
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
