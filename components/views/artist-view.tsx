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
import { SongRowDownload } from "@/components/download-button";
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
import { CollapsibleDescription } from "../collapsible-description";
import { Badge } from "../ui/badge";

interface ArtistViewProps {
  artistSlug: string;
  onPlaySong?: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function ArtistView({
  artistSlug,
  currentSong,
  isPlaying,
  onPlaySong,
}: ArtistViewProps) {
  const { navigate, navigateBack } = useNavigation();
  const { data: session } = useSession();
  const { artist, isLoading } = useArtist(artistSlug);
  const { likedArtistIds, mutate: mutateLikedArtists } = useLikedArtists({
    enabled: !!session?.user?.id,
  });
  const { playFromContext, setIsShuffled, isSongQueued } = usePlayer();
  const [isLiking, setIsLiking] = useState(false);

  const isLiked = artist ? likedArtistIds.has(artist.id) : false;

  // Handle play artist action
  const handlePlayArtist = () => {
    if (artist?.songs[0]) {
      playFromContext(artist.songs[0], artist.songs, "playlist");
    }
  };

  // Handle play song action
  const handlePlaySong = (song: Song) => {
    if (onPlaySong) {
      onPlaySong(song);
    } else if (artist) {
      playFromContext(song, artist.songs, "playlist");
    }
  };

  const handleShufflePlay = () => {
    if (!artist || artist.songs.length === 0) return;

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
      <div
        className="p-6 md:p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]"
        role="alert"
        aria-label="Artist not found"
      >
        <p className="text-muted-foreground font-medium">Artist not found</p>
      </div>
    );
  }

  const formatListeners = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-full pb-24 md:pb-8">
      {/* Artist Header - Improved desktop layout */}
      <div className="relative h-72 md:h-80 lg:h-96 overflow-hidden">
        {/* Background Image */}
        <Image
          width={1920}
          height={1080}
          src={artist.imageUrl || "/placeholder.svg"}
          alt={artist.name}
          className="w-full h-full object-cover object-center"
          priority
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateBack}
            className="bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Artist Info - Bottom aligned with proper spacing */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 drop-shadow-2xl">
              {artist.name}
            </h1>
            <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
              <Users className="w-4 h-4" />
              <span>
                {formatListeners(artist.monthlyListeners)} monthly listeners
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section - Separate from header gradient */}
      <div className="relative z-10">
        {/* Bio and Actions Section */}
        <div className="px-4 md:px-8 lg:px-10 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            {/* Bio Section */}
            {artist.bio && (
              <div className="mb-8">
                <CollapsibleDescription
                  description={artist.bio}
                  lines={2}
                  descriptionClassName="text-muted-foreground"
                  className="max-w-3xl"
                />
              </div>
            )}

            {/* Genres */}
            {artist.genres && artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {artist.genres.map((genre) => (
                  <Badge variant="outline" key={genre} className="px-3 py-2">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Actions - Now aligned with content */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
                onClick={handlePlayArtist}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Play
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
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
                aria-label={isLiked ? "Unlike artist" : "Like artist"}
              >
                <Heart
                  className={cn(
                    "w-5 h-5",
                    isLiked && "fill-current text-red-500",
                  )}
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
          </div>
        </div>

        {/* Popular Songs Section */}
        <div className="px-4 md:px-8 lg:px-10 pb-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Popular
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({artist.songs.length})
              </span>
            </h2>

            <div className="space-y-2">
              {artist.songs.length > 0 ? (
                artist.songs.map((song: Song, index: number) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <SongContextMenu key={song.id} song={song}>
                      <div
                        className={cn(
                          "group relative border-0 bg-transparent transition-all duration-200 cursor-pointer",
                          "hover:bg-muted/50 focus-within:bg-muted/60 rounded-lg",
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
                            width={44}
                            height={44}
                            src={getSongCoverUrl(song)}
                            alt=""
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
                            <AlbumMetadata
                              name={song.album}
                              type={song.albumType}
                              className="text-xs text-muted-foreground truncate"
                            />
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
                          <SongRowDownload song={song} />
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
                  No songs available for this artist yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Play Button */}
      {artist.songs.length > 0 && (
        <div className="md:hidden fixed bottom-24 left-0 right-0 z-40 px-4 drop-shadow-xl">
          <Button
            size="lg"
            className="w-full rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all font-semibold"
            onClick={handlePlayArtist}
            aria-label={`Play artist ${artist.name}`}
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
                Play Artist
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
