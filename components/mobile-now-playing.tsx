"use client";

import { useSession } from "next-auth/react";
import { Play, Pause, SkipForward, Heart, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { cn, getSongCoverUrl } from "@/lib/utils";
import { MobileLyricsView } from "./mobile-lyrics-view";
import { useToggleLikeSong } from "@/lib/swr";
import { requireLoginRedirect } from "@/lib/require-login";
import { usePlayer } from "@/components/player-context";
import { useHomePlayerUrl } from "@/hooks/use-home-player-url";
import Image from "next/image";

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
  const { showNowPlaying, setShowNowPlaying, setOpenMobileLyricsTab } = usePlayer();
  const { isHome, setPlayerInUrl } = useHomePlayerUrl();
  
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

  const openFullView = () => {
    setOpenMobileLyricsTab(false);
    setShowNowPlaying(true);
    if (isHome) {
      setPlayerInUrl(true);
    }
  };

  const closeFullView = () => {
    setShowNowPlaying(false);
    if (isHome) {
      setPlayerInUrl(false);
    }
  };

  if (showNowPlaying) {
    return (
      <MobileLyricsView
        key={song.id}
        song={song}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onClose={closeFullView}
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
      <div className="h-0.5 bg-primary/20">
        <div
          className="h-full bg-linear-to-r from-primary to-secondary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        className="bg-card/95 backdrop-blur-xl border-t border-border/40 px-4 py-3"
        onClick={openFullView}
      >
        <div className="flex items-center gap-3">
          {/* Album art with subtle animation */}
          <div className="relative">
            <Image
              src={getSongCoverUrl(song)}
              alt={song.title}
              width={48}
              height={48}
              className={cn(
                "w-12 h-12 rounded-lg object-cover shadow-lg ring-1 ring-primary/20",
                isPlaying && "animate-pulse"
              )}
              unoptimized
            />
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{song.title}</p>
            <p className="text-sm text-primary/70 truncate">{song.artist}</p>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-10 w-10"
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
              className="text-foreground hover:text-foreground h-10 w-10"
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
              className="text-muted-foreground hover:text-foreground h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Expand indicator */}
          <ChevronUp className="w-4 h-4 text-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
}
