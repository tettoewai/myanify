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
import { useLikedArtists, likeArtist, unlikeArtist } from "@/lib/swr";
import { usePlayer } from "@/components/player-context";
import { SongContextMenu } from "@/components/song-context-menu";
import { ListMusic } from "lucide-react";
import { cn, getSongCoverUrl } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { RateLimitError, notifyRateLimitError } from "@/lib/api-client";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { DetailPageSkeleton } from "@/components/loading-skeletons";
import { useSession } from "next-auth/react";
import { requireLoginRedirect } from "@/lib/require-login";
import { AlbumMetadata } from "@/components/album-metadata";
import { ShareButton } from "@/components/share-button";

interface ArtistViewProps {
  artistSlug: string;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function ArtistView({
  artistSlug,
  onPlaySong,
  currentSong,
  isPlaying,
}: ArtistViewProps) {
  const { navigate, navigateBack } = useNavigation();
  const { data: session } = useSession();
  const { artist, isLoading } = useArtist(artistSlug);
  const { likedArtistIds, mutate: mutateLikedArtists } = useLikedArtists({
    enabled: !!session?.user?.id,
  });
  const { playFromContext, setIsShuffled, isSongQueued } = usePlayer();
  const [isLiking, setIsLiking] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const isLiked = artist ? likedArtistIds.has(artist.id) : false;

  const handleShufflePlay = () => {
    if (!artist || artist.songs.length === 0) return;

    // Shuffle the songs
    const shuffledSongs = [...artist.songs].sort(() => Math.random() - 0.5);

    setIsShuffled(true);
    playFromContext(shuffledSongs[0], shuffledSongs, "playlist");
  };

  const handleLikeToggle = async () => {
    if (isLiking || !artist) return;

    if (!session?.user?.id) {
      requireLoginRedirect(undefined, "save");
      return;
    }

    setIsLiking(true);
    try {
      const ok = isLiked
        ? await unlikeArtist(artist.id)
        : await likeArtist(artist.id);

      if (ok) {
        toast.success(
          isLiked
            ? "Removed from your liked artists"
            : "Added to your liked artists",
        );
        mutateLikedArtists();
      } else {
        toast.error("Couldn't update liked artists");
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      if (error instanceof RateLimitError) {
        notifyRateLimitError(error.retryAfterSeconds);
      } else {
        toast.error("Couldn't update liked artists");
      }
    } finally {
      setIsLiking(false);
    }
  };

  if (isLoading) {
    return <DetailPageSkeleton bannerClassName="h-72 md:h-96" />;
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
            onClick={() => navigateBack()}
            className="bg-black/20 hover:bg-black/40 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <h1 className="text-4xl md:text-4xl font-bold text-foreground mb-2">
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

      {/* Bio */}
      <div className="px-6 md:px-8 mb-6">
        <div className="relative">
          <p
            className={cn(
              "text-muted-foreground transition-all duration-300",
              !isBioExpanded && "line-clamp-2"
            )}
          >
            {artist.bio}
          </p>
          {artist.bio && artist.bio.length > 150 && (
            <button
              onClick={() => setIsBioExpanded(!isBioExpanded)}
              className="text-primary hover:underline text-sm font-medium mt-1"
            >
              {isBioExpanded ? "See less" : "See more"}
            </button>
          )}
        </div>
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

      {/* Actions */}
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() =>
            artist.songs[0] &&
            playFromContext(artist.songs[0], artist.songs, "playlist")
          }
        >
          <Play className="w-5 h-5 mr-2" />
          Play
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full bg-transparent"
          onClick={handleShufflePlay}
          disabled={!artist || artist.songs.length === 0}
        >
          <Shuffle className="w-5 h-5 mr-2" />
          Shuffle
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full"
          onClick={handleLikeToggle}
          disabled={isLiking}
        >
          <Heart
            className={cn("w-5 h-5", isLiked && "fill-current text-red-500")}
          />
        </Button>
        <ShareButton
          payload={{
            type: "artist",
            slug: artist.slug,
            title: artist.name,
            text: `Listen to ${artist.name} on Myanify`,
          }}
        />
        <Button size="icon" variant="ghost" className="rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Popular Songs */}
      <div className="px-4 md:px-8 pb-8">
        <h2 className="text-xl font-bold mb-4">Popular</h2>
        <div className="space-y-2">
          {artist.songs.length > 0 ? (
            artist.songs.map((song: Song, index: number) => (
              <SongContextMenu key={song.id} song={song}>
              <div
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer",
                  currentSong?.id === song.id && "bg-primary/10"
                )}
              >
                <button
                  onClick={() =>
                    playFromContext(song, artist.songs, "playlist")
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
                    width={48}
                    height={48}
                    src={getSongCoverUrl(song)}
                    alt={song.title || song.album || "Song cover"}
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
                    <AlbumMetadata
                      name={song.album}
                      type={song.albumType}
                      className="text-sm text-muted-foreground"
                    />
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
              No songs available for this artist yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
