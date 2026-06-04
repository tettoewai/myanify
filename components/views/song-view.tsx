"use client";

import Image from "next/image";
import { ArrowLeft, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { AlbumMetadata } from "@/components/album-metadata";
import { DetailPageSkeleton } from "@/components/loading-skeletons";
import { useNavigation } from "@/lib/navigation";
import { useSong } from "@/lib/swr";
import { usePlayer } from "@/components/player-context";
import { cn } from "@/lib/utils";

interface SongViewProps {
  songId: string;
  currentSongId: string | null;
  isPlaying: boolean;
}

export function SongView({
  songId,
  currentSongId,
  isPlaying,
}: SongViewProps) {
  const { navigate } = useNavigation();
  const { song, isLoading } = useSong(songId);
  const { playSong } = usePlayer();

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
  const cover = song.albumCoverUrl || song.coverUrl || "/placeholder.svg";

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
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("home")}
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

      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() => playSong(song)}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 mr-2" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          {isCurrent && isPlaying ? "Playing" : "Play"}
        </Button>
        <ShareButton
          payload={{
            type: "song",
            id: song.id,
            title: song.title,
            text: `${song.title} by ${song.artist}`,
          }}
        />
        {song.albumId ? (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate("album", song.albumId!)}
          >
            View album
          </Button>
        ) : null}
        {song.artistIds?.[0] ? (
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => navigate("artist", song.artistIds![0])}
          >
            View artist
          </Button>
        ) : null}
      </div>

      <div className="px-6 md:px-8 pb-8">
        <div
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border",
          )}
        >
          <Image
            src={cover}
            alt={song.title}
            width={64}
            height={64}
            className="w-16 h-16 rounded-lg object-cover"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{song.title}</p>
            <p className="text-sm text-muted-foreground truncate">
              {song.artist}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.floor(song.duration / 60)}:
              {(song.duration % 60).toString().padStart(2, "0")}
              {song.genre ? ` · ${song.genre}` : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
