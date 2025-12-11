"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Heart,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const activeRef = useRef<HTMLDivElement>(null);
  const [isLiked, setIsLiked] = useState(false);

  const currentLyricIndex = song.lyrics.reduce((prevIndex, curr, index) => {
    if (curr.time <= currentTime) return index;
    return prevIndex;
  }, 0);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentLyricIndex]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-amber-950 via-stone-950 to-stone-900 flex flex-col">
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

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
      </div>

      {/* Lyrics area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl mx-auto py-[30vh]">
          {song.lyrics.length > 0 ? (
            <div className="space-y-12">
              {song.lyrics.map((line, index) => {
                const isActive = index === currentLyricIndex;
                const isPast = index < currentLyricIndex;

                return (
                  <div
                    key={index}
                    ref={isActive ? activeRef : null}
                    className={cn(
                      "transition-all duration-700 ease-out text-center",
                      isActive && "scale-105",
                      isPast && "opacity-30",
                      !isActive && !isPast && "opacity-50"
                    )}
                  >
                    <p
                      className={cn(
                        "text-2xl md:text-4xl lg:text-5xl leading-relaxed font-medium transition-all duration-700",
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
      <div className="relative z-10 p-6 md:p-8 bg-gradient-to-t from-black/80 to-transparent">
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
                onClick={() => setIsLiked(!isLiked)}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                <Heart
                  className={cn(
                    "w-6 h-6",
                    isLiked && "fill-amber-400 text-amber-400"
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
            <span className="text-xs text-white/60 w-10 text-right font-mono">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={song.duration}
              step={1}
              onValueChange={(v) => onTimeChange(v[0])}
              className="flex-1 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_.bg-primary]:bg-amber-400"
            />
            <span className="text-xs text-white/60 w-10 font-mono">
              {formatTime(song.duration)}
            </span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-6">
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
        </div>
      </div>
    </div>
  );
}
