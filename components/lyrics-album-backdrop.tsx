"use client";

import type { Song } from "@/lib/types";
import { cn, getSongCoverUrl } from "@/lib/utils";

interface LyricsAlbumBackdropProps {
  song: Song;
  variant?: "fullscreen" | "panel";
  className?: string;
}

export function LyricsAlbumBackdrop({
  song,
  variant = "fullscreen",
  className,
}: LyricsAlbumBackdropProps) {
  const imageUrl = getSongCoverUrl(song);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center",
          variant === "fullscreen" && "opacity-30 blur-3xl scale-110",
          variant === "panel" && "opacity-40 blur-2xl scale-125",
        )}
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div
        className={cn(
          "absolute inset-0",
          variant === "fullscreen" &&
            "bg-linear-to-b from-black/60 via-transparent to-black/80",
          variant === "panel" &&
            "bg-linear-to-b from-background/90 via-background/75 to-background/90",
        )}
      />
    </div>
  );
}
