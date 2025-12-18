"use client";

import { Input } from "@/components/ui/input";
import { useNavigation } from "@/lib/navigation";
import { useArtists, useGenres, useSongs } from "@/lib/swr";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pause, Play, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchViewProps {
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function SearchView({
  onPlaySong,
  currentSong,
  isPlaying,
}: SearchViewProps) {
  const { navigate } = useNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const isUpdatingFromUserInput = useRef(false);
  const isInitialMount = useRef(true);
  const lastUrlQuery = useRef<string>("");

  // Initialize query from URL on mount only
  useEffect(() => {
    if (isInitialMount.current) {
      const urlQuery = searchParams.get("q") || "";
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
      lastUrlQuery.current = urlQuery;
      isInitialMount.current = false;
    }
  }, [searchParams]);

  // Debounce query for URL updates and API calls
  useEffect(() => {
    // Skip if this is the initial mount (we already set debouncedQuery above)
    if (isInitialMount.current) {
      return;
    }

    isUpdatingFromUserInput.current = true;
    const timeoutId = setTimeout(() => {
      const trimmedQuery = query.trim();
      setDebouncedQuery(trimmedQuery);

      const params = new URLSearchParams(searchParams.toString());
      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      } else {
        params.delete("q");
      }
      const newUrl = params.toString()
        ? `/search?${params.toString()}`
        : "/search";

      lastUrlQuery.current = trimmedQuery;
      router.replace(newUrl, { scroll: false });

      // Reset flag after URL update completes
      setTimeout(() => {
        isUpdatingFromUserInput.current = false;
      }, 200);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [query, router, searchParams]);

  // Sync from URL only if it's an external change (back/forward navigation)
  useEffect(() => {
    // Skip on initial mount or if we're updating from user input
    if (isInitialMount.current || isUpdatingFromUserInput.current) {
      return;
    }

    const urlQuery = searchParams.get("q") || "";
    // Only update if URL query is different from what we last set
    // This handles cases like browser back/forward or external navigation
    if (urlQuery !== lastUrlQuery.current && urlQuery !== query) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
      lastUrlQuery.current = urlQuery;
    }
  }, [searchParams, query]);

  // Use SWR hooks for data fetching - only fetch when there's a search query
  const shouldSearch = debouncedQuery.trim().length > 0;
  const { songs, isLoading: songsLoading } = useSongs(
    shouldSearch ? { isPublished: true, search: debouncedQuery } : undefined
  );
  const { artists, isLoading: artistsLoading } = useArtists(
    shouldSearch ? { search: debouncedQuery } : undefined
  );
  const { genres } = useGenres();

  const hasResults = songs.length > 0 || artists.length > 0;
  const showBrowse = !debouncedQuery.trim();
  const isLoading = songsLoading || artistsLoading;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
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
            className="pl-12 pr-10 py-6 text-lg bg-card border-border rounded-full"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                router.replace("/search", { scroll: false });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Browse All - shown when no search query */}
      {showBrowse && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Browse All</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => navigate("genre", genre.id)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer"
              >
                <Image
                  src={genre.imageUrl || "/placeholder.svg"}
                  alt={genre.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white text-lg">{genre.name}</h3>
                  <p className="text-sm text-white/70">{genre.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Search Results */}
      {debouncedQuery && isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      )}

      {debouncedQuery && !isLoading && !hasResults && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            No results found for "{debouncedQuery}"
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Try searching for a different song or artist
          </p>
        </div>
      )}

      {/* Artists Results */}
      {debouncedQuery && artists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => navigate("artist", artist.id)}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors cursor-pointer"
              >
                <Image
                  src={artist.imageUrl || "/placeholder.svg"}
                  alt={artist.name}
                  width={96}
                  height={96}
                  className="rounded-full object-cover shadow-lg"
                  unoptimized
                />
                <div className="text-center">
                  <p className="font-semibold text-sm">{artist.name}</p>
                  <p className="text-xs text-muted-foreground">Artist</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Songs Results */}
      {debouncedQuery && songs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Songs</h2>
          <div className="space-y-2">
            {songs.map((song, index) => (
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
                  src={
                    song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
                  }
                  alt={song.title}
                  width={48}
                  height={48}
                  className="rounded-md object-cover"
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
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
