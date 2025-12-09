"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [isLiked, setIsLiked] = useState(false);

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
    <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-gradient-to-t from-stone-950 to-stone-900/95 backdrop-blur-xl border-t border-amber-900/20 z-50 hidden md:block">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 w-72 shrink-0">
            <div
              className="relative group cursor-pointer"
              onClick={onOpenFullscreenLyrics}
            >
              <img
                src={currentSong.coverUrl || "/placeholder.svg"}
                alt={currentSong.title}
                className="w-14 h-14 rounded-lg object-cover shadow-lg ring-1 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all"
              />
              <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-foreground">
                {currentSong.title}
              </p>
              <p className="text-sm text-amber-500/70 truncate">
                {currentSong.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart
                className={cn(
                  "w-4 h-4",
                  isLiked && "fill-amber-500 text-amber-500"
                )}
              />
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2 max-w-xl mx-auto">
            <div className="flex items-center gap-2">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-lg shadow-amber-500/25"
                onClick={onTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
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
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-muted-foreground hover:text-foreground",
                showLyrics && "text-amber-500 bg-amber-500/10"
              )}
              onClick={onToggleLyrics}
            >
              <Mic2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ListMusic className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 w-32">
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
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(v) => {
                  setVolume(v[0]);
                  setIsMuted(false);
                }}
                className="flex-1 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenFullscreenLyrics}
              className="text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
