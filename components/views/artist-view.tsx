"use client";

import {
  ArrowLeft,
  Play,
  Pause,
  Shuffle,
  Heart,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { useNavigation } from "@/lib/navigation";
import { useArtist } from "@/lib/swr";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ArtistViewProps {
  artistId: string;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function ArtistView({
  artistId,
  onPlaySong,
  currentSong,
  isPlaying,
}: ArtistViewProps) {
  const { navigate } = useNavigation();
  const { artist, isLoading } = useArtist(artistId);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  const formatListeners = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-full">
      {/* Artist Header */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <Image
          width={1000}
          height={1000}
          src={artist.imageUrl || "/placeholder.svg"}
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
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
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
              Verified Artist
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-3">
            {artist.name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {formatListeners(artist.monthlyListeners)} monthly listeners
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() => artist.songs[0] && onPlaySong(artist.songs[0])}
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
          <Heart className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Bio */}
      <div className="px-6 md:px-8 mb-6">
        <p className="text-muted-foreground">{artist.bio}</p>
        <div className="flex gap-2 mt-3">
          {artist.genres.map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 rounded-full bg-card text-sm"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Popular Songs */}
      <div className="px-4 md:px-8 pb-8">
        <h2 className="text-xl font-bold mb-4">Popular</h2>
        <div className="space-y-2">
          {artist.songs.length > 0 ? (
            artist.songs.map((song: Song, index: number) => (
              <button
                key={song.id}
                onClick={() => onPlaySong(song)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer",
                  currentSong?.id === song.id && "bg-primary/10"
                )}
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
                  width={48}
                  height={48}
                  src={
                    song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
                  }
                  alt={song.title}
                  className="w-12 h-12 rounded-md object-cover"
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
                    {song.album}
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
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No songs available for this artist yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
