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
import { CollapsibleDescription } from "@/components/collapsible-description";

interface GenreViewProps {
  genreSlug: string;
  onPlaySong?: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function GenreView({
  genreSlug,
  currentSong,
  isPlaying,
  onPlaySong,
}: GenreViewProps) {
  const { navigateBack } = useNavigation();
  const { genre, isLoading } = useGenre(genreSlug);
  const { playFromContext, isSongQueued, setIsShuffled } = usePlayer();

  // Handle play genre action
  const handlePlayGenre = () => {
    if (genre?.songs[0]) {
      playFromContext(genre.songs[0], genre.songs, "playlist");
    }
  };

  // Handle play song action
  const handlePlaySong = (song: Song) => {
    if (onPlaySong) {
      onPlaySong(song);
    } else if (genre) {
      playFromContext(song, genre.songs, "playlist");
    }
  };

  const handleShufflePlay = () => {
    if (genre?.songs.length) {
      setIsShuffled(true);
      playFromContext(
        genre.songs[Math.floor(Math.random() * genre.songs.length)],
        genre.songs,
        "playlist",
      );
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!genre) {
    return (
      <div
        className="p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]"
        role="alert"
        aria-label="Genre not found"
      >
        <p className="text-muted-foreground font-medium">Genre not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-24 md:pb-8">
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
            onClick={navigateBack}
            className="bg-black/20 hover:bg-black/40 text-white rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-1">Genre</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
            {genre.name}
          </h1>
        </div>
      </div>

      <div className="px-6 md:px-8 mt-6 mb-6">
        <CollapsibleDescription description={genre.description} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 px-6 md:px-8 mt-6 mb-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={handlePlayGenre}
        >
          <Play className="w-5 h-5 mr-2 fill-current" />
          Play
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full"
          onClick={handleShufflePlay}
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Shuffle
        </Button>
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-8 pb-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          Songs
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({genre.songs.length})
          </span>
        </h2>
        <div className="space-y-2">
          {genre.songs.length > 0 ? (
            genre.songs.map((song: Song, index: number) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <SongContextMenu key={song.id} song={song}>
                  <div
                    className={cn(
                      "group relative border-0 bg-transparent transition-all duration-200 cursor-pointer",
                      "hover:bg-muted/50 focus-within:bg-muted/60",
                      isCurrent &&
                        "bg-primary/5 hover:bg-primary/10 focus-within:bg-primary/10",
                    )}
                    onClick={() => handlePlaySong(song)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handlePlaySong(song);
                      }
                    }}
                    tabIndex={0}
                    role="listitem"
                    aria-label={`Play ${song.title} by ${song.artist}`}
                  >
                    <div className="w-full flex items-center gap-3 md:gap-4 px-3 py-2.5 rounded-xl text-left">
                      {/* Track Number Indicator */}
                      <div
                        className="w-6 text-center shrink-0 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        {isCurrent && isPlaying ? (
                          <>
                            <Pause className="w-4 h-4 text-primary group-hover:hidden" />
                            <Pause className="w-4 h-4 text-primary hidden group-hover:block fill-current" />
                          </>
                        ) : isCurrent ? (
                          <>
                            <span className="text-sm text-primary font-semibold tabular-nums group-hover:hidden">
                              {index + 1}
                            </span>
                            <Play className="w-4 h-4 text-primary hidden group-hover:block fill-current" />
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-muted-foreground/70 tabular-nums group-hover:hidden">
                              {index + 1}
                            </span>
                            <Play className="w-4 h-4 text-foreground/80 hidden group-hover:block fill-current" />
                          </>
                        )}
                      </div>

                      {/* Song Thumbnail */}
                      <Image
                        src={getSongCoverUrl(song)}
                        alt=""
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-md object-cover shrink-0 bg-muted"
                        aria-hidden="true"
                      />

                      {/* Song Info */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p
                          className={cn(
                            "font-medium truncate text-sm md:text-base text-foreground/90",
                            isCurrent && "text-primary font-semibold",
                          )}
                        >
                          {song.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {song.artist}
                        </p>
                      </div>

                      {/* Duration */}
                      <span
                        className="text-xs md:text-sm text-muted-foreground/80 tabular-nums shrink-0"
                        aria-label={`Duration: ${Math.floor(song.duration / 60)} minutes and ${(song.duration % 60).toString().padStart(2, "0")} seconds`}
                      >
                        {Math.floor(song.duration / 60)}:
                        {(song.duration % 60).toString().padStart(2, "0")}
                      </span>

                      {/* Premium Badge */}
                      {song.isPremium && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium shrink-0">
                          Premium
                        </span>
                      )}

                      {/* Queue Indicator */}
                      {isSongQueued(song.id) && (
                        <ListMusic
                          className="w-4 h-4 text-primary shrink-0"
                          aria-label="Currently in queue"
                        />
                      )}

                      {/* Add to Playlist Button */}
                      <div
                        className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <AddToPlaylistDialog songId={song.id} />
                      </div>
                    </div>
                  </div>
                </SongContextMenu>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No songs in this genre yet
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Play Button */}
      {genre.songs.length > 0 && (
        <div className="md:hidden fixed bottom-24 left-0 right-0 z-40 px-4 drop-shadow-xl">
          <Button
            size="lg"
            className="w-full rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-semibold"
            onClick={handlePlayGenre}
            aria-label={`Play genre ${genre.name}`}
          >
            {currentSong && isPlaying ? (
              <>
                <Pause
                  className="w-5 h-5 mr-2 fill-current"
                  aria-hidden="true"
                />
                Currently Playing
              </>
            ) : (
              <>
                <Play
                  className="w-5 h-5 mr-2 fill-current"
                  aria-hidden="true"
                />
                Play Genre
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
