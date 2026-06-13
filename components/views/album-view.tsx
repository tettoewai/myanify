"use client";

import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { AlbumTypeBadge } from "@/components/album-type-badge";
import { DetailPageSkeleton } from "@/components/loading-skeletons";
import { usePlayer } from "@/components/player-context";
import { ShareButton } from "@/components/share-button";
import { SongContextMenu } from "@/components/song-context-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/lib/navigation";
import { useAlbum } from "@/lib/swr";
import type { Song } from "@/lib/types";
import { cn, getSongCoverUrl } from "@/lib/utils";
import {
  ArrowLeft,
  ListMusic,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { Card } from "../ui/card";
import { useCallback, useMemo, useRef, useState } from "react";
import { CollapsibleDescription } from "../collapsible-description";

interface AlbumViewProps {
  albumSlug: string;
  onPlaySong?: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function AlbumView({
  albumSlug,
  currentSong,
  isPlaying,
  onPlaySong,
}: AlbumViewProps) {
  const { navigateBack } = useNavigation();
  const { album, isLoading } = useAlbum(albumSlug);
  const { playFromContext, isSongQueued } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Memoize songs array to prevent unnecessary re-renders
  const songs: Song[] = useMemo(() => album?.songs || [], [album?.songs]);

  // Handle play album action
  const handlePlayAlbum = useCallback(() => {
    if (songs[0]) {
      playFromContext(songs[0], songs, "playlist");
    }
  }, [songs, playFromContext]);

  // Handle play song action
  const handlePlaySong = useCallback(
    (song: Song) => {
      if (onPlaySong) {
        onPlaySong(song);
      } else {
        playFromContext(song, songs, "playlist");
      }
    },
    [onPlaySong, playFromContext, songs],
  );

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!album) {
    return (
      <div
        className="p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]"
        role="alert"
        aria-label="Album not found"
      >
        <p className="text-muted-foreground font-medium">Album not found</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-full pb-32 md:pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border/10 bg-gradient-to-b from-background/10 to-background/50">
        {/* Background Blur */}
        {album.coverUrl && (
          <div
            className="absolute inset-0 opacity-15 blur-3xl scale-110 pointer-events-none transition-opacity duration-500"
            style={{
              backgroundImage: `url(${album.coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />
        )}

        <div className="relative px-4 md:px-8 py-6 md:py-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateBack}
            className="mb-4 md:mb-6 hover:bg-muted/80 rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Album Info */}
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-center md:items-end">
            {/* Album Cover */}
            <div className="relative shrink-0 group">
              <Image
                src={album.coverUrl || "/placeholder.svg"}
                alt={`Cover art for ${album.name}`}
                width={280}
                height={280}
                priority
                className="
                  w-44 h-44
                  sm:w-56 sm:h-56
                  md:w-64 md:h-64
                  lg:w-72 lg:h-72
                  rounded-2xl
                  shadow-2xl
                  object-cover
                  transition-transform
                  duration-300
                  group-hover:scale-[1.01]
                "
              />
            </div>

            {/* Album Details */}
            <div className="flex-1 text-center md:text-left min-w-0 w-full">
              <AlbumTypeBadge type={album.type} />

              <h1 className="mt-3 text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground line-clamp-2 md:line-clamp-none">
                {album.name}
              </h1>

              <CollapsibleDescription description={album.description} />

              <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start items-center text-sm font-medium text-muted-foreground">
                {album.releaseDate && (
                  <time dateTime={album.releaseDate}>
                    {new Date(album.releaseDate).getFullYear()}
                  </time>
                )}

                <span aria-hidden="true" className="text-muted-foreground/40">
                  •
                </span>

                <span>
                  {songs.length} {songs.length === 1 ? "Song" : "Songs"}
                </span>
              </div>

              {/* Desktop Action Buttons */}
              <div className="hidden md:flex items-center gap-3 mt-6">
                <Button
                  size="lg"
                  className="rounded-full px-8 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  onClick={handlePlayAlbum}
                  aria-label={`Play album ${album.name}`}
                >
                  <Play
                    className="w-5 h-5 mr-2 fill-current"
                    aria-hidden="true"
                  />
                  Play Album
                </Button>

                <ShareButton
                  size="lg"
                  variant="outline"
                  className="rounded-full hover:bg-secondary/80"
                  payload={{
                    type: "album",
                    slug: album.slug,
                    title: album.name,
                    text: `Listen to ${album.name} on Myanify`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Songs Section */}
      <div className="px-4 md:px-8 mt-8">
        <div className="mx-auto w-full md:mx-0">
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            Tracks
            <span className="text-sm font-normal text-muted-foreground">
              ({songs.length})
            </span>
          </h2>

          {songs.length > 0 ? (
            <div className="space-y-1" role="list" aria-label="Album tracks">
              {songs.map((song, index) => {
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
                        {/* Track Number / Interactive Context Play State Indicator */}
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

                        {/* Song Content */}
                        <SongContent song={song} currentSong={currentSong} />

                        {/* Row Status Indicator Accessories */}
                        <div
                          className="flex items-center gap-2 ml-auto shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isSongQueued(song.id) && (
                            <ListMusic
                              className="w-4 h-4 text-primary"
                              aria-label="Currently in queue"
                            />
                          )}

                          {/* Trigger actions menu wrapper display */}
                          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                            <AddToPlaylistDialog songId={song.id} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </SongContextMenu>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
              <p className="text-muted-foreground text-sm">
                No songs in this release yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Floating Action Trigger Bar */}
      {songs.length > 0 && (
        <div className="md:hidden fixed bottom-24 left-0 right-0 z-40 px-4 drop-shadow-xl">
          <Button
            size="lg"
            className="w-full rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-semibold"
            onClick={handlePlayAlbum}
            aria-label={`Play album ${album.name}`}
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
                Play Album
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface SongContentProps {
  song: Song;
  currentSong: Song | null;
}

function SongContent({ song, currentSong }: SongContentProps) {
  const isCurrent = currentSong?.id === song.id;

  return (
    <>
      {/* Song Thumbnail */}
      <Image
        src={getSongCoverUrl(song)}
        alt=""
        width={44}
        height={44}
        className="rounded-lg object-cover shadow-sm shrink-0 bg-muted"
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
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {song.artist}
        </p>
      </div>

      {/* Duration Metrics Display Layout block */}
      <span
        className="text-xs md:text-sm text-muted-foreground/80 tabular-nums shrink-0 hidden sm:inline-block font-normal"
        aria-label={`Duration: ${Math.floor(song.duration / 60)} minutes and ${(song.duration % 60).toString().padStart(2, "0")} seconds`}
      >
        {Math.floor(song.duration / 60)}:
        {(song.duration % 60).toString().padStart(2, "0")}
      </span>
    </>
  );
}
