"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  ChevronDown,
  Heart,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/components/player-context";
import { requireLoginRedirect } from "@/lib/require-login";
import { useToggleLikeSong, useSongWithLyrics } from "@/lib/swr";
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
import { getSongCoverUrl } from "@/lib/utils";

interface MobileLyricsViewProps {
  song: Song;
  currentTime: number;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTimeChange: (time: number) => void;
}

export function MobileLyricsView({
  song,
  currentTime,
  isPlaying,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
}: MobileLyricsViewProps) {
  const { data: session } = useSession();
  const { audioRef, isShuffled, setIsShuffled, repeatMode, setRepeatMode } =
    usePlayer();
  const [showLyrics, setShowLyrics] = useState(true);

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

  const { song: songWithLyrics, isLoadingLyrics } = useSongWithLyrics(song);
  const displaySong = songWithLyrics ?? song;
  const lyrics = useMemo(
    () => displaySong.lyrics ?? [],
    [displaySong.lyrics],
  );

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
    enabled: showLyrics,
  });

  const [size, setSize] = useState<LyricSize>("md");

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-linear-to-br from-amber-950 via-stone-950 to-stone-900 flex flex-col leading-loose overflow-hidden">
      <LyricsAlbumBackdrop song={song} variant="fullscreen" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-safe">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
        >
          <ChevronDown className="w-6 h-6" />
        </Button>

        <div className="flex-1 w-full px-3 text-center justify-center items-center">
          <p className="text-xs uppercase tracking-wider text-primary font-medium leading-loose">
            Now Playing
          </p>
          <AlbumMetadata
            name={song.album}
            type={song.albumType}
            className="text-sm text-white/60 mt-0.5 leading-loose max-w-36 mx-auto"
          />
        </div>

        <LyricSizeToggle
          size={size}
          onSizeChange={setSize}
          className="shrink-0"
        />
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">
        {showLyrics ? (
          <div
            ref={containerRef}
            className={cn(
              "relative flex-1 min-h-0 overflow-y-auto px-6",
              lyricsScrollMaskClass,
            )}
          >
            {lyrics.length > 0 && (
              <div className="min-h-[50%] shrink-0" aria-hidden />
            )}
            {isLoadingLyrics ? (
              <div className="text-center py-20">
                <p className="text-white/60 text-lg leading-loose">
                  Loading lyrics...
                </p>
              </div>
            ) : lyrics.length > 0 ? (
              <div className="space-y-10">
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
                          size === "sm" && "text-lg",
                          size === "md" && "text-xl",
                          size === "lg" && "text-2xl",
                          isActive
                            ? "text-white drop-shadow-[0_0_24px_rgba(251,191,36,0.35)] scale-100"
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
                <p className="text-white/60 text-lg leading-loose">
                  No lyrics available for this song
                </p>
              </div>
            )}
            {lyrics.length > 0 && (
              <div className="min-h-[50%] shrink-0" aria-hidden />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-10">
            <div className="relative w-full max-w-xs aspect-square">
              <Image
                src={getSongCoverUrl(song)}
                alt={song.title}
                fill
                className="rounded-2xl object-cover shadow-2xl ring-2 ring-white/10"
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-6 pb-safe pt-4 bg-linear-to-t from-black/80 to-transparent">
        {/* Cover / Lyrics toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center rounded-full bg-white/10 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(false)}
              className={cn(
                "rounded-full px-4 h-8 text-xs leading-loose",
                !showLyrics
                  ? "bg-white text-stone-900 hover:bg-white/90"
                  : "text-white/70 hover:text-white hover:bg-white/10",
              )}
            >
              Cover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(true)}
              className={cn(
                "rounded-full px-4 h-8 text-xs leading-loose",
                showLyrics
                  ? "bg-white text-stone-900 hover:bg-white/90"
                  : "text-white/70 hover:text-white hover:bg-white/10",
              )}
            >
              Lyrics
            </Button>
          </div>
        </div>

        {/* Song info */}
        <div className="flex items-center gap-3 mb-4">
          <Image
            src={getSongCoverUrl(song)}
            alt={song.title}
            width={56}
            height={56}
            className="w-14 h-14 rounded-xl object-cover shadow-xl ring-2 ring-white/10 shrink-0"
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg text-white truncate leading-loose">
              {song.title}
            </p>
            <p className="text-sm text-white/60 truncate leading-loose">
              {song.artist}
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
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-white/60 w-10 text-right font-mono leading-loose">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={song.duration}
            step={1}
            onValueChange={(v) => onTimeChange(v[0])}
            className="flex-1 **:[[role=slider]]:bg-white **:[[role=slider]]:border-0 **:[[role=slider]]:w-3 **:[[role=slider]]:h-3 [&_.bg-primary]:bg-primary"
          />
          <span className="text-xs text-white/60 w-10 font-mono leading-loose">
            {formatTime(song.duration)}
          </span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 pb-10">
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
  );
}
