"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  ChevronDown,
  Share2,
  MoreHorizontal,
  Repeat,
  Shuffle,
  ListMusic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [isLiked, setIsLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef(currentTime);

  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const newTime = timeRef.current + 1;
        if (newTime >= currentSong.duration) {
          onNext();
          onTimeChange(0);
        } else {
          onTimeChange(newTime);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentSong, onTimeChange, onNext]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentLyric = currentSong.lyrics.reduce((prev, curr) => {
    if (curr.time <= currentTime) return curr;
    return prev;
  }, currentSong.lyrics[0]);

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronDown className="w-6 h-6" />
        </Button>
        <span className="text-sm font-medium">Now Playing</span>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="w-6 h-6" />
        </Button>
      </div>

      {/* Album Art */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl mb-8">
          <img
            src={currentSong.coverUrl || "/placeholder.svg"}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Song Info */}
        <div className="w-full max-w-sm text-center mb-4">
          <h2 className="text-2xl font-bold truncate">{currentSong.title}</h2>
          <p className="text-muted-foreground">{currentSong.artist}</p>
        </div>

        {/* Current Lyric */}
        {showLyrics && currentLyric && (
          <div className="w-full max-w-sm text-center mb-4 p-4 rounded-xl bg-primary/10">
            <p className="text-lg font-medium text-primary">
              {currentLyric.text}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-12 space-y-6">
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
          <Button variant="ghost" size="icon">
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
          <Button variant="ghost" size="icon">
            <Repeat className="w-5 h-5" />
          </Button>
        </div>

        {/* Extra Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart
              className={cn("w-6 h-6", isLiked && "fill-primary text-primary")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLyrics(!showLyrics)}
            className={cn(showLyrics && "text-primary")}
          >
            <ListMusic className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}
