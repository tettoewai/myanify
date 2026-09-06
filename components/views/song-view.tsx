"use client";

import Image from "next/image";
import { ArrowLeft, Play, Pause, Mic2, Music2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/download-button";
import { ShareButton } from "@/components/share-button";
import { AlbumMetadata } from "@/components/album-metadata";
import { DetailPageSkeleton } from "@/components/loading-skeletons";
import { useNavigation } from "@/lib/navigation";
import { useSong, useToggleLikeSong } from "@/lib/swr";
import { usePlayer } from "@/components/player-context";
import { requireLoginRedirect } from "@/lib/require-login";
import { cn, getSongCoverUrl } from "@/lib/utils";
import type { LyricLine } from "@/lib/types";
import { useSession } from "next-auth/react";

interface SongViewProps {
  songSlug: string;
  currentSongId: string | null;
  isPlaying: boolean;
}

export function SongView({
  songSlug,
  currentSongId,
  isPlaying,
}: SongViewProps) {
  const { navigate, navigateBack } = useNavigation();
  const { song, isLoading } = useSong(songSlug, false, { includeLyrics: true });
  const { playSong, togglePlay } = usePlayer();
  const { data: session } = useSession();
  const { isLiked, toggleLike } = useToggleLikeSong({
    enabled: !!session?.user?.id,
  });

  if (isLoading) {
    return <DetailPageSkeleton bannerClassName="h-80 md:h-96" />;
  }

  if (!song || song.isPublished === false) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Song not found</p>
      </div>
    );
  }

  const isCurrent = currentSongId === song.id;
  const cover = getSongCoverUrl(song);
  const hasLyrics = song.lyrics && song.lyrics.length > 0;
  const lyricsPreview = hasLyrics ? song.lyrics!.slice(0, 6) : [];

  return (
    <div className="min-h-full">
      <div className="relative h-80 md:h-96 overflow-hidden">
        <Image
          src={cover}
          alt={song.title}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateBack()}
            className="bg-black/20 hover:bg-black/40 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-1">Song</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
            {song.title}
          </h1>
          <p className="text-lg text-muted-foreground">{song.artist}</p>
          {song.album ? (
            <AlbumMetadata
              name={song.album}
              type={song.albumType}
              className="text-sm text-muted-foreground mt-1"
            />
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 p-6 md:p-8 flex-wrap">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() => {
            if (isCurrent) togglePlay();
            else playSong(song);
          }}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 mr-2" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          {isCurrent && isPlaying ? "Playing" : "Play"}
        </Button>
        <Button
          size="lg"
          variant={song && isLiked(song.id) ? "default" : "outline"}
          className="rounded-full"
          aria-pressed={song ? isLiked(song.id) : false}
          aria-label={
            !session?.user?.id
              ? "Sign in to like songs"
              : song && isLiked(song.id)
                ? "Remove from favorites"
                : "Add to favorites"
          }
          onClick={() => {
            if (!session?.user?.id) {
              requireLoginRedirect(undefined, "save");
              return;
            }
            void toggleLike(song);
          }}
        >
          <Heart
            className={cn(
              "w-5 h-5 mr-2",
              song && isLiked(song.id) && "fill-current",
            )}
          />
          {song && isLiked(song.id) ? "Liked" : "Like"}
        </Button>
        <ShareButton
          payload={{
            type: "song",
            slug: song.slug,
            title: song.title,
            text: `${song.title} by ${song.artist}`,
          }}
        />
        <DownloadButton song={song} />
        {song.albumSlug ? (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate("album", song.albumSlug!)}
          >
            View album
          </Button>
        ) : null}
        {song.artistSlugs?.[0] ? (
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => navigate("artist", song.artistSlugs![0])}
          >
            View artist
          </Button>
        ) : null}
      </div>

      {/* Lyrics preview */}
      {hasLyrics && (
        <div className="px-6 md:px-8 pb-6">
          <div className="rounded-xl bg-card/60 border border-border/50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
              <Mic2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Lyrics</span>
            </div>
            <div className="px-5 py-4 space-y-1">
              {lyricsPreview.map((line: LyricLine, i: number) => (
                <p
                  key={i}
                  className={cn(
                    "text-sm leading-relaxed",
                    line.text
                      ? isCurrent && isPlaying
                        ? "text-foreground"
                        : "text-muted-foreground"
                      : "h-3"
                  )}
                >
                  {line.text || "\u00A0"}
                </p>
              ))}
              {song.lyrics!.length > 6 && (
                <button
                  type="button"
                  onClick={() => playSong(song)}
                  className="mt-3 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Play to see full lyrics →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Song info card */}
      <div className="px-6 md:px-8 pb-8">
        <button
          type="button"
          onClick={() => {
            if (isCurrent) togglePlay();
            else playSong(song);
          }}
          aria-label={`Play ${song.title}`}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border",
            "hover:bg-card transition-colors cursor-pointer text-left",
            isCurrent && isPlaying && "border-primary/50 bg-primary/5",
          )}
        >
          <div className="relative">
            <Image
              src={cover}
              alt={song.title}
              width={64}
              height={64}
              className="w-16 h-16 rounded-lg object-cover"
              unoptimized
            />
            {isCurrent && isPlaying && (
              <div className="absolute inset-0 rounded-lg bg-primary/20 flex items-center justify-center">
                <Music2 className="w-6 h-6 text-primary animate-pulse" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("font-medium truncate", isCurrent && "text-primary")}>{song.title}</p>
            <p className="text-sm text-muted-foreground truncate">
              {song.artist}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.floor(song.duration / 60)}:
              {(song.duration % 60).toString().padStart(2, "0")}
              {song.genre ? ` · ${song.genre}` : ""}
              {song.isPremium && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs">Premium</span>}
            </p>
          </div>
          <span className="shrink-0 text-muted-foreground">
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
