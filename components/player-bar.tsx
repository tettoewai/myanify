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
  ChevronDown,
  Heart,
  List,
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { usePlayer } from "./player-context";

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
  // Local seek state — avoids audio jumping while dragging
  const [seekValue, setSeekValue] = useState<number | null>(null);
  const displayTime = seekValue ?? currentTime;

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

  const cycleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("off");
  };

  const progress = currentSong ? (currentTime / currentSong.duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <TooltipProvider>
      {/* ─────────────────────────── DESKTOP BAR ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-linear-to-t from-background to-card/95 backdrop-blur-xl border-t border-border/40 z-50 hidden md:block">
        {/* Rainbow accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* ── Left: Song info ── */}
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

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground leading-snug">
                  {currentSong.title}
                </p>
                <p className="text-xs text-primary/80 truncate leading-snug">
                  {currentSong.artist}
                </p>
                {nextUp ? (
                  <p className="text-[10px] text-muted-foreground truncate leading-snug">
                    Up next: {nextUp.title}
                  </p>
                ) : radioMode ? (
                  <p className="text-[10px] text-muted-foreground truncate leading-snug">
                    Similar songs will follow
                  </p>
                ) : null}
              </div>

              <Tooltip>
                {/* <TooltipTrigger asChild>
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
                </TooltipTrigger> */}
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
                          <List className="w-4 h-4" />
                        </Button>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Add to playlist</TooltipContent>
              </Tooltip>
            </div>

            {/* ── Center: Transport + Seek ── */}
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

              {/* Seek bar */}
              <div className="w-full flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10 text-right font-mono tabular-nums">
                  {formatTime(displayTime)}
                </span>
                <Slider
                  value={[displayTime]}
                  max={currentSong.duration}
                  step={1}
                  onValueChange={(v) => setSeekValue(v[0])}
                  onValueCommit={(v) => {
                    onTimeChange(v[0]);
                    setSeekValue(null);
                  }}
                  className="flex-1 [&_[role=slider]]:bg-primary [&_[role=slider]]:border-0 [&_.bg-primary]:bg-primary"
                  aria-label="Song progress"
                  aria-valuetext={`${formatTime(displayTime)} of ${formatTime(currentSong.duration)}`}
                />
                <span className="text-xs text-muted-foreground w-10 font-mono tabular-nums">
                  {formatTime(currentSong.duration)}
                </span>
              </div>
            </div>

            {/* ── Right: Volume + Extras ── */}
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
                <TooltipContent>Queue</TooltipContent>
              </Tooltip>

              {/* Volume */}
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

      {/* ─────────────────────────── MOBILE BAR ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* ── Expanded full-screen mobile view ── */}
        {isMobileExpanded && (
          <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-amber-950 via-stone-950 to-stone-900 overflow-hidden">
            {/* Blurred album backdrop */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              aria-hidden
            >
              <Image
                src={getSongCoverUrl(currentSong)}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-20 blur-2xl scale-110"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/50" />
            </div>

            {/* Drag handle */}
            <div className="relative z-10 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                onClick={() => setIsMobileExpanded(false)}
                aria-label="Collapse player"
              >
                <ChevronDown className="w-6 h-6" />
              </Button>

              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-primary font-medium">
                  Now Playing
                </p>
                {nextUp ? (
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Up next: {nextUp.title}
                  </p>
                ) : radioMode ? (
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Similar songs will follow
                  </p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-white/70 hover:text-white hover:bg-white/10 rounded-full relative",
                  showQueue && "text-primary",
                )}
                onClick={() => setShowQueue(!showQueue)}
                aria-label="Queue"
              >
                <ListMusic className="w-5 h-5" />
                {radioMode && (
                  <Radio className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-primary" />
                )}
              </Button>
            </div>

            {/* Album art */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-10 py-4 min-h-0">
              <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/10">
                <Image
                  src={getSongCoverUrl(currentSong)}
                  alt={currentSong.title}
                  fill
                  sizes="(max-width: 768px) 80vw, 320px"
                  className={cn(
                    "object-cover transition-all duration-500",
                    isPlaying && "scale-105",
                  )}
                  unoptimized
                />
              </div>
            </div>

            {/* Bottom controls */}
            <div className="relative z-10 px-6 pb-safe pt-2">
              {/* Song info + actions */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xl text-white truncate leading-snug">
                    {currentSong.title}
                  </p>
                  <p className="text-sm text-white/60 truncate leading-snug mt-0.5">
                    {currentSong.artist}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleLike}
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
                  <ShareButton
                    payload={{
                      type: "song",
                      slug: currentSong.slug,
                      title: currentSong.title,
                      text: `${currentSong.title} by ${currentSong.artist}`,
                    }}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    iconClassName="w-5 h-5"
                  />
                  <AddToPlaylistDialog
                    songId={currentSong.id}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                      >
                        <List className="w-5 h-5" />
                      </Button>
                    }
                  />
                </div>
              </div>
              {/* Seek bar */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs text-white/50 w-10 text-right font-mono tabular-nums">
                  {formatTime(displayTime)}
                </span>
                <Slider
                  value={[displayTime]}
                  max={currentSong.duration}
                  step={1}
                  onValueChange={(v) => setSeekValue(v[0])}
                  onValueCommit={(v) => {
                    onTimeChange(v[0]);
                    setSeekValue(null);
                  }}
                  aria-label="Song progress"
                />
                <span className="text-xs text-white/50 w-10 font-mono tabular-nums">
                  {formatTime(currentSong.duration)}
                </span>
              </div>
              {/* Transport controls */}
              <div className="flex items-center justify-between mb-5">
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

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrev}
                  className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
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
                  className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-12 h-12"
                >
                  <SkipForward className="w-6 h-6" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleRepeat}
                  className={cn(
                    "relative text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10",
                    repeatMode !== "off" && "text-primary",
                  )}
                >
                  <Repeat className="w-5 h-5" />
                  {repeatMode === "one" && (
                    <span className="absolute text-[8px] font-bold">1</span>
                  )}
                </Button>
              </div>
              Volume + extras row
              <div className="flex items-center gap-3 pb-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/50 hover:text-white hover:bg-white/10 rounded-full shrink-0"
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
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={
                    currentSongLyrics !== undefined &&
                    currentSongLyrics.length === 0
                  }
                  onClick={onToggleLyrics}
                  className={cn(
                    "text-white/50 hover:text-white hover:bg-white/10 rounded-full shrink-0",
                    showLyrics && "text-primary",
                    currentSongLyrics !== undefined &&
                      currentSongLyrics.length === 0 &&
                      "opacity-40 cursor-not-allowed",
                  )}
                  aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                >
                  <Mic2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenFullscreenLyrics}
                  className="text-white/50 hover:text-white hover:bg-white/10 rounded-full shrink-0"
                  aria-label="Fullscreen lyrics"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
