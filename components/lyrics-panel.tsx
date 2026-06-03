"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { X, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlbumMetadata } from "@/components/album-metadata";
import {
  LyricSizeToggle,
  type LyricSize,
} from "@/components/lyric-size-toggle";
import { usePlayer } from "@/components/player-context";
import { useSyncedLyrics } from "@/lib/lyrics-sync";
import { LyricsAlbumBackdrop } from "@/components/lyrics-album-backdrop";
import {
  LYRIC_LINE_TRANSITION,
  LYRIC_TEXT_TRANSITION,
  useLyricsAutoScroll,
} from "@/lib/lyrics-scroll";
import { getSongCoverUrl } from "@/lib/utils";

interface LyricsPanelProps {
  song: Song;
  currentTime: number;
  onClose: () => void;
}

export function LyricsPanel({ song, currentTime, onClose }: LyricsPanelProps) {
  const { audioRef } = usePlayer();
  const lyrics = useMemo(() => song.lyrics || [], [song.lyrics]);

  const { currentLyricIndex, seekToken } = useSyncedLyrics(
    lyrics,
    currentTime,
    audioRef,
  );

  const { containerRef, activeRef } = useLyricsAutoScroll({
    currentLyricIndex,
    seekToken,
    lyrics,
  });

  const [size, setSize] = useState<LyricSize>("md");

  return (
    <aside className="relative w-80 lg:w-[420px] h-full overflow-hidden border-l border-amber-900/20 flex-col hidden lg:flex leading-loose">
      <LyricsAlbumBackdrop song={song} variant="panel" />

      <div className="relative z-10 flex flex-col h-full min-h-0">
      <div className="p-5 border-b border-amber-900/20 flex items-center justify-between bg-amber-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <Music2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground leading-loose">
              Lyrics
            </h2>
            <p className="text-xs text-muted-foreground leading-loose">
              Synced with music
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LyricSizeToggle
            size={size}
            onSizeChange={setSize}
            variant="panel"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-5 border-b border-amber-900/20 bg-amber-950/10 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={getSongCoverUrl(song)}
              alt={song.title}
              width={64}
              height={64}
              className="w-16 h-16 rounded-xl object-cover shadow-xl ring-2 ring-primary/20"
              unoptimized
            />
            <div className="absolute inset-0 rounded-xl bg-linear-to-t from-black/40 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-foreground leading-loose">
              {song.title}
            </p>
            <p className="text-xs text-primary/80 truncate leading-loose">
              {song.artist}
            </p>
            <AlbumMetadata
              name={song.album}
              type={song.albumType}
              className="text-xs text-muted-foreground mt-1 leading-loose"
            />
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-secondary/30 scrollbar-track-transparent"
      >
        <div className="py-8 px-6">
          {lyrics.length > 0 ? (
            <div className="space-y-8">
              {lyrics.map((line, index) => {
                const isActive = index === currentLyricIndex;
                const isPast = index < currentLyricIndex;
                const isFuture = index > currentLyricIndex;

                return (
                  <div
                    key={index}
                    ref={isActive ? activeRef : null}
                    data-lyric-line
                    className={cn(
                      LYRIC_LINE_TRANSITION,
                      "relative group cursor-pointer",
                      isActive && "scale-100",
                      isPast && "opacity-40",
                      isFuture && "opacity-60",
                    )}
                  >
                    {isActive && (
                      <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full bg-linear-to-b from-primary via-primary/70 to-primary shadow-lg shadow-primary/50" />
                    )}

                    <p
                      className={cn(
                        LYRIC_TEXT_TRANSITION,
                        "leading-loose font-medium",
                        size === "sm" && "text-sm",
                        size === "md" && "text-lg",
                        size === "lg" && "text-xl",
                        isActive
                          ? "text-primary scale-100"
                          : isPast
                            ? "text-muted-foreground scale-[0.98]"
                            : "text-foreground/80 scale-[0.98]",
                      )}
                    >
                      {line.text}
                    </p>

                    {isActive && (
                      <div className="absolute -inset-4 bg-primary/5 rounded-2xl -z-10 blur-xl" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-900/20 flex items-center justify-center mb-4">
                <Music2 className="w-10 h-10 text-amber-500/50" />
              </div>
              <p className="text-muted-foreground font-medium leading-loose">
                No lyrics available
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1 leading-loose">
                Lyrics for this song haven&apos;t been added yet
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-amber-900/20 bg-amber-950/20 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground leading-loose">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="leading-loose">Auto-scrolling to current lyric</span>
        </div>
      </div>
      </div>
    </aside>
  );
}
