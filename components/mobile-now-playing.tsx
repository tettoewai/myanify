"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Play, Pause, SkipForward, Heart, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MobileLyricsView } from "./mobile-lyrics-view";
import { useToggleLikeSong } from "@/lib/swr";
import { requireLoginRedirect } from "@/lib/require-login";

interface MobileNowPlayingProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTimeChange: (time: number) => void;
}

export function MobileNowPlaying({
  song,
  isPlaying,
  currentTime,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
}: MobileNowPlayingProps) {
  const { data: session } = useSession();
  const [showFullView, setShowFullView] = useState(false);
  
  // Fetch liked songs from database
  const { isLiked, toggleLike } = useToggleLikeSong({
    enabled: !!session?.user?.id,
  });

  const songIsLiked = isLiked(song.id);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "save");
      return;
    }

    void toggleLike(song);
  };

  const progress = (currentTime / song.duration) * 100;

  if (showFullView) {
    return (
      <MobileLyricsView
        key={song.id}
        song={song}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onClose={() => setShowFullView(false)}
        onTogglePlay={onTogglePlay}
        onNext={onNext}
        onPrev={onPrev}
        onTimeChange={onTimeChange}
      />
    );
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 md:hidden z-40">
      {/* Progress bar at top */}
      <div className="h-0.5 bg-amber-900/30">
        <div
          className="h-full bg-linear-to-r from-amber-500 to-amber-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className="bg-stone-900/95 backdrop-blur-xl border-t border-amber-900/20 px-4 py-3"
        onClick={() => setShowFullView(true)}
      >
        <div className="flex items-center gap-3">
          {/* Album art with subtle animation */}
          <div className="relative">
            <Image
              src={song.albumCoverUrl || song.coverUrl || "/placeholder.svg"}
              alt={song.title}
              width={48}
              height={48}
              className={cn(
                "w-12 h-12 rounded-lg object-cover shadow-lg ring-1 ring-amber-500/20",
                isPlaying && "animate-pulse"
              )}
              unoptimized
            />
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{song.title}</p>
            <p className="text-sm text-amber-500/70 truncate">{song.artist}</p>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white h-10 w-10"
              onClick={handleToggleLike}
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  songIsLiked && "fill-primary text-primary transition-colors"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-white h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:text-white h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Expand indicator */}
          <ChevronUp className="w-4 h-4 text-white/40" />
        </div>
      </div>
    </div>
  );
}
