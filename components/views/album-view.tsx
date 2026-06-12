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
import { ArrowLeft, ListMusic, Pause, Play } from "lucide-react";
import Image from "next/image";

interface AlbumViewProps {
  albumSlug: string;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function AlbumView({
  albumSlug,
  onPlaySong,
  currentSong,
  isPlaying,
}: AlbumViewProps) {
  const { navigate, navigateBack } = useNavigation();
  const { album, isLoading } = useAlbum(albumSlug);
  const { playFromContext, isSongQueued } = usePlayer();

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!album) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    );
  }

  const songs: Song[] = album.songs || [];

  return (
    <div className="min-h-full">
      <div className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src={album.coverUrl || "/placeholder.svg"}
          alt={album.name}
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
          <div className="flex items-center gap-2 mb-2">
            <AlbumTypeBadge type={album.type} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
            {album.name}
          </h1>
          {album.releaseDate && (
            <p className="text-sm text-muted-foreground mb-1">
              {new Date(album.releaseDate).getFullYear()}
            </p>
          )}
          {album.description && (
            <p className="text-muted-foreground line-clamp-2">
              {album.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          disabled={songs.length === 0}
          onClick={() =>
            songs[0] && playFromContext(songs[0], songs, "playlist")
          }
        >
          <Play className="w-5 h-5 mr-2" />
          Play
        </Button>
        <ShareButton
          payload={{
            type: "album",
            slug: album.slug,
            title: album.name,
            text: `Listen to ${album.name} on Myanify`,
          }}
        />
        <p className="text-sm text-muted-foreground">
          {songs.length} {songs.length === 1 ? "song" : "songs"}
        </p>
      </div>

      <div className="px-4 md:px-8 pb-8">
        <div className="space-y-2">
          {songs.length > 0 ? (
            songs.map((song, index) => (
              <SongContextMenu key={song.id} song={song}>
                <div
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group",
                    currentSong?.id === song.id && "bg-primary/10",
                  )}
                >
                  <button
                    onClick={() => playFromContext(song, songs, "playlist")}
                    className="flex items-center gap-4 flex-1 min-w-0 text-left"
                  >
                    <span className="w-8 text-center text-sm text-muted-foreground group-hover:hidden">
                      {index + 1}
                    </span>
                    <span className="w-8 hidden group-hover:flex items-center justify-center">
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
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium truncate",
                          currentSong?.id === song.id && "text-primary",
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
                  </button>
                  {isSongQueued(song.id) && (
                    <ListMusic
                      className="w-4 h-4 text-primary shrink-0"
                      aria-label="In queue"
                    />
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <AddToPlaylistDialog songId={song.id} />
                  </div>
                </div>
              </SongContextMenu>
            ))
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              No songs in this release yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
