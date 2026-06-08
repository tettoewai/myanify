"use client";

import Image from "next/image";
import { ArrowLeft, Play, Pause, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { useNavigation } from "@/lib/navigation";
import { useGenre } from "@/lib/swr";
import { cn, getSongCoverUrl } from "@/lib/utils";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { DetailPageSkeleton } from "@/components/loading-skeletons";
import { SongContextMenu } from "@/components/song-context-menu";
import { usePlayer } from "@/components/player-context";
import { ListMusic } from "lucide-react";

interface GenreViewProps {
  genreSlug: string;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function GenreView({
  genreSlug,
  onPlaySong,
  currentSong,
  isPlaying,
}: GenreViewProps) {
  const { navigate, navigateBack } = useNavigation();
  const { genre, isLoading } = useGenre(genreSlug);
  const { playFromContext, isSongQueued, setIsShuffled } = usePlayer();

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!genre) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Genre not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Genre Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src={genre.imageUrl || "/placeholder.svg"}
          alt={genre.name}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
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
          <p className="text-sm text-muted-foreground mb-1">Genre</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            {genre.name}
          </h1>
          <p className="text-muted-foreground">{genre.description}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() =>
            genre.songs[0] &&
            playFromContext(genre.songs[0], genre.songs, "playlist")
          }
        >
          <Play className="w-5 h-5 mr-2" />
          Play
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full bg-transparent"
          onClick={() => {
            if (genre.songs.length > 0) {
              setIsShuffled(true);
              playFromContext(genre.songs[Math.floor(Math.random() * genre.songs.length)], genre.songs, "playlist");
            }
          }}
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Shuffle
        </Button>
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-8 pb-8">
        <div className="space-y-2">
          {genre.songs.length > 0 ? (
            genre.songs.map((song: Song, index: number) => (
              <SongContextMenu key={song.id} song={song}>
              <div
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer",
                  currentSong?.id === song.id && "bg-primary/10"
                )}
              >
                <button
                  onClick={() =>
                    playFromContext(song, genre.songs, "playlist")
                  }
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <span className="w-6 text-center text-sm text-muted-foreground group-hover:hidden">
                    {index + 1}
                  </span>
                  <span className="w-6 hidden group-hover:flex items-center justify-center">
                    {currentSong?.id === song.id && isPlaying ? (
                      <Pause className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary" />
                    )}
                  </span>
                  <Image
                    src={getSongCoverUrl(song)}
                    alt={song.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-md object-cover"
                    unoptimized
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p
                      className={cn(
                        "font-medium truncate",
                        currentSong?.id === song.id && "text-primary"
                      )}
                    >
                      {song.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.floor(song.duration / 60)}:
                    {(song.duration % 60).toString().padStart(2, "0")}
                  </span>
                  {song.isPremium && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      Premium
                    </span>
                  )}
                </button>
                {isSongQueued(song.id) && (
                  <ListMusic className="w-4 h-4 text-primary shrink-0" />
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <AddToPlaylistDialog songId={song.id} />
                </div>
              </div>
              </SongContextMenu>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No songs in this genre yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
