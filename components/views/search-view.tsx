"use client";

import { Input } from "@/components/ui/input";
import { useNavigation } from "@/lib/navigation";
import { useArtists, useGenres, useSongs } from "@/lib/swr";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pause, Play, Search, X, Music, Users } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchViewProps {
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

// Loading skeleton for songs list
function SongsLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
          <Skeleton className="w-6 h-4" />
          <Skeleton className="w-12 h-12 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="w-10 h-4" />
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for artists grid
function ArtistsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col items-center gap-3 p-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function SearchView({
  onPlaySong,
  currentSong,
  isPlaying,
}: SearchViewProps) {
  const { navigate } = useNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQueryOnMount = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQueryOnMount);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQueryOnMount);
  const skipNextUrlSync = useRef(false);

  // Debounce local input and sync to URL only when ?q= actually changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmedQuery = query.trim();
      setDebouncedQuery(trimmedQuery);

      const urlQuery =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("q") || ""
          : "";
      if (trimmedQuery === urlQuery) return;

      skipNextUrlSync.current = true;
      const newUrl = trimmedQuery
        ? `/search?q=${encodeURIComponent(trimmedQuery)}`
        : "/search";
      router.replace(newUrl, { scroll: false });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, router]);

  // Sync input from URL (back/forward, external links) — not from our own replace
  useEffect(() => {
    if (skipNextUrlSync.current) {
      skipNextUrlSync.current = false;
      return;
    }

    const urlQuery = searchParams.get("q") || "";
    setQuery((prev) => (prev === urlQuery ? prev : urlQuery));
    setDebouncedQuery((prev) => (prev === urlQuery ? prev : urlQuery));
  }, [searchParams]);

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    skipNextUrlSync.current = true;
    router.replace("/search", { scroll: false });
  };

  const shouldSearch = debouncedQuery.trim().length > 0;
  const {
    songs,
    isLoading: songsLoading,
    isValidating: songsValidating,
  } = useSongs(
    shouldSearch ? { isPublished: true, search: debouncedQuery } : undefined,
  );
  const {
    artists,
    isLoading: artistsLoading,
    isValidating: artistsValidating,
  } = useArtists(shouldSearch ? { search: debouncedQuery } : undefined);
  const { genres } = useGenres();

  const isLoading =
    (songsLoading || artistsLoading) && (songsValidating || artistsValidating);
  const hasResults = !isLoading && (songs.length > 0 || artists.length > 0);
  const showBrowse = !debouncedQuery.trim();

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-8 pb-32">
      {/* Search Header */}
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Search
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-10 py-3 md:py-6 text-base md:text-lg bg-card border-border rounded-full"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Browse All (no search) */}
      {showBrowse && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Browse All</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => navigate("genre", genre.id)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Image
                  src={genre.imageUrl || "/placeholder.svg"}
                  alt={genre.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  unoptimized
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <h3 className="font-bold text-white text-lg">{genre.name}</h3>
                  <p className="text-sm text-white/70 line-clamp-1">
                    {genre.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Search Results - Loading */}
      {shouldSearch && isLoading && (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Artists</h2>
            <ArtistsLoadingSkeleton />
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Songs</h2>
            <SongsLoadingSkeleton />
          </section>
        </div>
      )}

      {/* Search Results - No results */}
      {shouldSearch && !isLoading && !hasResults && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <Music className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-lg">
            No results found for "{debouncedQuery}"
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try searching for a different song, artist, or genre
          </p>
        </div>
      )}

      {/* Artists Results */}
      {shouldSearch && !isLoading && artists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Artists
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => navigate("artist", artist.id)}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="relative w-24 h-24">
                  <Image
                    src={artist.imageUrl || "/placeholder.svg"}
                    alt={artist.name}
                    fill
                    className="rounded-full object-cover shadow-lg"
                    unoptimized
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm line-clamp-1">
                    {artist.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Artist</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Songs Results */}
      {shouldSearch && !isLoading && songs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Music className="w-5 h-5" /> Songs
          </h2>
          <div className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group",
                  currentSong?.id === song.id && "bg-primary/10",
                )}
              >
                <button
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
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
                  <div className="relative w-12 h-12 shrink-0">
                    <Image
                      src={
                        song.albumCoverUrl ||
                        song.coverUrl ||
                        "/placeholder.svg"
                      }
                      alt={song.title}
                      fill
                      className="rounded-md object-cover"
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
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
                  <span className="text-sm text-muted-foreground shrink-0">
                    {Math.floor(song.duration / 60)}:
                    {(song.duration % 60).toString().padStart(2, "0")}
                  </span>
                  {song.isPremium && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium shrink-0">
                      Premium
                    </span>
                  )}
                </button>
                {/* Always visible on mobile, visible on hover on desktop */}
                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <AddToPlaylistDialog songId={song.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
