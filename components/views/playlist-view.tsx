"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  MoreHorizontal,
  Clock,
  Share2,
  Pencil,
  X,
  GripVertical,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { usePlaylist } from "@/lib/swr";
import { cn } from "@/lib/utils";

interface PlaylistViewProps {
  playlistId: string;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function PlaylistView({
  playlistId,
  onPlaySong,
  currentSong,
  isPlaying,
}: PlaylistViewProps) {
  const { playlist, isLoading, mutate } = usePlaylist(playlistId);
  const [removingSongId, setRemovingSongId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handleRemoveSong = async (songId: string) => {
    setRemovingSongId(songId);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs?songId=${songId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove song from playlist");
      }

      // Refresh playlist data
      mutate();
    } catch (error) {
      console.error("Error removing song from playlist:", error);
      // TODO: Show error toast
    } finally {
      setRemovingSongId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (index: number) => {
    setDropTargetIndex(index);
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDropTargetIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex || !playlist) return;

    // Reorder the songs array
    const reorderedSongs = [...playlist.songs];
    const [draggedSong] = reorderedSongs.splice(draggedIndex, 1);
    reorderedSongs.splice(dropIndex, 0, draggedSong);

    // Optimistically update the UI
    mutate((currentData: any) => {
      if (!currentData) return currentData;
      return { ...currentData, songs: reorderedSongs };
    }, false);

    // Update the order in the database first
    try {
      const updates = reorderedSongs.map((song, index) => ({
        playlistId,
        songId: song.id,
        order: index,
      }));

      // Update all song orders in the playlist
      await Promise.all(
        updates.map(update =>
          fetch(`/api/playlists/${playlistId}/songs?songId=${update.songId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ order: update.order }),
          })
        )
      );

      // Refresh playlist data from server
      mutate();
    } catch (error) {
      console.error("Error reordering songs:", error);
      // TODO: Show error toast
    } finally {
      setDraggedIndex(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Playlist not found</p>
      </div>
    );
  }

  const totalDuration = playlist.songs.reduce(
    (acc, song) => acc + song.duration,
    0
  );
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="min-h-full">
      {/* Playlist Header */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-end bg-gradient-to-b from-primary/20 to-background">
        <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 bg-muted">
          {(() => {
            // Get up to 4 song covers for the composite image
            const songCovers = playlist.songs
              .slice(0, 4)
              .map(song => song.albumCoverUrl || song.coverUrl)
              .filter(url => url && url !== "/placeholder.svg");

            if (songCovers.length > 0) {
              return (
                <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                  {songCovers.map((coverUrl, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={coverUrl}
                        alt={`${playlist.name} song ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                  {/* Fill empty slots with placeholder if less than 4 songs */}
                  {Array.from({ length: 4 - songCovers.length }).map((_, index) => (
                    <div key={`placeholder-${index}`} className="relative bg-muted flex items-center justify-center">
                      <div className="w-8 h-8 rounded bg-muted-foreground/20" />
                    </div>
                  ))}
                </div>
              );
            } else {
              // Fallback to single cover or placeholder
              return (
                <Image
                  src={playlist.coverUrl || "/placeholder.svg"}
                  alt={playlist.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              );
            }
          })()}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">Playlist</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 text-balance">
            {playlist.name}
          </h1>
          <p className="text-muted-foreground mb-3">{playlist.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {playlist.createdBy}
            </span>
            <span>•</span>
            <span>{playlist.songs.length} songs</span>
            <span>•</span>
            <span>
              {hours > 0 ? `${hours} hr ` : ""}
              {minutes} min
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() => playlist.songs[0] && onPlaySong(playlist.songs[0])}
        >
          <Play className="w-5 h-5 mr-2" />
          Play
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full bg-transparent"
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Shuffle
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Songs Table Header */}
      <div className="hidden md:flex items-center gap-4 px-8 py-2 text-xs text-muted-foreground border-b border-border mx-4 md:mx-8">
        <span className="w-8 text-center">#</span>
        <span className="flex-1">Title</span>
        <span className="w-32">Album</span>
        <Clock className="w-4 h-4" />
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-8 pb-8">
        <div className="space-y-1">
          {playlist.songs.map((song, index) => (
            <div
              key={song.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-move",
                currentSong?.id === song.id && "bg-primary/10",
                draggedIndex === index && "opacity-50",
                dropTargetIndex === index && "border-t-2 border-primary"
                
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-4 flex-1 min-w-0"
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
                    src={song.albumCoverUrl || song.coverUrl || "/placeholder.svg"}
                    alt={song.title}
                    width={48}
                    height={48}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover"
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
                  <span className="hidden md:block w-32 text-sm text-muted-foreground truncate">
                    {song.album}
                  </span>
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
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSong(song.id);
                }}
                disabled={removingSongId === song.id}
              >
                {removingSongId === song.id ? (
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
