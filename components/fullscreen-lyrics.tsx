"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn, getSongCoverUrl } from "@/lib/utils";
import {
  ChevronDown,
  Heart,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePlayer } from "@/components/player-context";
import { requireLoginRedirect } from "@/lib/require-login";
import { useToggleLikeSong } from "@/lib/swr";
import { AlbumMetadata } from "@/components/album-metadata";
import {
  LyricSizeToggle,
  type LyricSize,
} from "@/components/lyric-size-toggle";
import { useSyncedLyrics } from "@/lib/lyrics-sync";
import { LyricsAlbumBackdrop } from "@/components/lyrics-album-backdrop";
import { ShareButton } from "@/components/share-button";
import { lyricsScrollMaskClass } from "@/components/lyrics-scroll-fade";
import {
  LYRIC_LINE_TRANSITION,
  LYRIC_TEXT_TRANSITION,
  useLyricsAutoScroll,
} from "@/lib/lyrics-scroll";
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
  const { data: session } = useSession();
  const {
    audioRef,
    isShuffled,
    setIsShuffled,
    repeatMode,
    setRepeatMode,
    currentSongLyrics,
    isLoadingLyrics,
    requestCurrentSongLyrics,
  } = usePlayer();

  useEffect(() => {
    requestCurrentSongLyrics();
  }, [requestCurrentSongLyrics, song.id]);

  const { isLiked, toggleLike } = useToggleLikeSong({
    enabled: !!session?.user?.id,
  });

  const songIsLiked = isLiked(song.id);

  const handleToggleLike = () => {
    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "save");
      return;
    }

    void toggleLike(song);
  };

  // Lead a bit so lines flip slightly before the beat to feel on-time

  const lyricsLoaded = currentSongLyrics !== undefined;
  const lyrics = useMemo(() => currentSongLyrics ?? [], [currentSongLyrics]);
  const showLyricsLoading = isLoadingLyrics || !lyricsLoaded;

  const { currentLyricIndex, seekToken } = useSyncedLyrics(
    lyrics,
    currentTime,
    audioRef,
    song.id,
  );

  const { containerRef, activeRef } = useLyricsAutoScroll({
    currentLyricIndex,
    seekToken,
    lyrics,
    resetKey: song.id,
  });

  const [size, setSize] = useState<LyricSize>(() => {
    if (typeof window === "undefined") return "md";
    try {
      const stored = localStorage.getItem("myanify_lyric_size");
      return (stored as LyricSize) ?? "md";
    } catch {
      return "md";
    }
  });

  const handleSizeChange = (newSize: LyricSize) => {
    setSize(newSize);
    try {
      localStorage.setItem("myanify_lyric_size", newSize);
    } catch {
      // silent fail
    }
  };

  const [seekValue, setSeekValue] = useState<number | null>(null);
  const displayTime = seekValue ?? currentTime;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-100 hidden md:flex flex-col bg-linear-to-br from-amber-950 via-stone-950 to-stone-900 leading-loose overflow-hidden">
      <LyricsAlbumBackdrop song={song} variant="fullscreen" />

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
          <p className="text-xs uppercase tracking-wider text-primary font-medium leading-loose">
            Now Playing
          </p>
          <AlbumMetadata
            name={song.album}
            type={song.albumType}
            className="text-sm text-white/60 mt-0.5 leading-loose"
          />
        </div>

        <LyricSizeToggle size={size} onSizeChange={handleSizeChange} />
      </div>

      {/* Lyrics area */}
      <div
        ref={containerRef}
        className={cn(
          "relative z-10 flex-1 min-h-0 overflow-y-auto px-6 md:px-12 lg:px-24",
          lyricsScrollMaskClass,
        )}
      >
        {lyrics.length > 0 && (
          <div className="min-h-[50%] shrink-0" aria-hidden />
        )}
        <div className="max-w-3xl mx-auto">
          {showLyricsLoading ? (
            <div className="text-center py-20">
              <p className="text-white/60 text-xl leading-loose">
                Loading lyrics...
              </p>
            </div>
          ) : lyrics.length > 0 ? (
            <div className="space-y-12">
              {lyrics.map((line, index) => {
                const isActive = index === currentLyricIndex;
                const isPast = index < currentLyricIndex;

                return (
                  <div
                    key={index}
                    data-lyric-line
                    ref={isActive ? activeRef : null}
                    className={cn(
                      LYRIC_LINE_TRANSITION,
                      "text-center",
                      isActive && "scale-105",
                      isPast && "opacity-30",
                      !isActive && !isPast && "opacity-50",
                    )}
                  >
                    <p
                      className={cn(
                        LYRIC_TEXT_TRANSITION,
                        "leading-loose font-medium",
                        size === "sm" && "text-lg md:text-xl lg:text-2xl",
                        size === "md" && "text-xl md:text-2xl lg:text-3xl",
                        size === "lg" && "text-2xl md:text-3xl lg:text-4xl",
                        isActive
                          ? "text-white drop-shadow-[0_0_30px_rgba(251,191,36,0.3)] scale-100"
                          : "text-white/70 scale-[0.98]",
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
              <p className="text-white/60 text-xl leading-loose">
                No lyrics available for this song
              </p>
            </div>
          )}
        </div>
        {lyrics.length > 0 && (
          <div className="min-h-[50%] shrink-0" aria-hidden />
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 p-6 md:p-8 bg-linear-to-t from-black/80 to-transparent">
        <div className="max-w-2xl mx-auto">
          {/* Song info */}
          <div className="flex items-center gap-4 mb-6">
            <Image
              src={getSongCoverUrl(song)}
              alt={song.title}
              width={80}
              height={80}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shadow-2xl ring-2 ring-white/10"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl md:text-2xl text-white truncate leading-loose">
                {song.title}
              </p>
              <p className="text-primary truncate leading-loose">
                {song.artist}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                  slug: song.slug,
                  title: song.title,
                  text: `${song.title} by ${song.artist}`,
                }}
                className="text-white/70 hover:text-white hover:bg-white/10"
                iconClassName="w-5 h-5"
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs text-white/60 w-10 text-right font-mono leading-loose">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[displayTime]}
              max={song.duration}
              step={1}
              onValueChange={(v) => setSeekValue(v[0])} // local only while dragging
              onValueCommit={(v) => {
                // fires on pointer up
                onTimeChange(v[0]);
                setSeekValue(null);
              }}
            />
            <span className="text-xs text-white/60 w-10 font-mono leading-loose">
              {formatTime(song.duration)}
            </span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4 md:gap-8">
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

            <div className="flex items-center gap-4 md:gap-6">
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

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (repeatMode === "off") setRepeatMode("all");
                else if (repeatMode === "all") setRepeatMode("one");
                else setRepeatMode("off");
              }}
              className={cn(
                "relative text-white/50 hover:text-white hover:bg-white/10 rounded-full w-10 h-10",
                repeatMode !== "off" && "text-primary",
              )}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === "one" && (
                <span className="absolute text-[8px] font-bold leading-loose">
                  1
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
