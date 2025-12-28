"use client";

import Image from "next/image";
import { Play, Pause, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { useNavigation } from "@/lib/navigation";
import { useSongs, useArtists, usePlaylists, useGenres } from "@/lib/swr";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, useMemo } from "react";
import { usePlayer } from "@/components/player-context";
import { AddToPlaylistDialog, AddToPlaylistDropdown } from "@/components/add-to-playlist-dialog";

interface HomeViewProps {
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

export function HomeView({
  onPlaySong,
  currentSong,
  isPlaying,
}: HomeViewProps) {
  const { navigate } = useNavigation();
  const { getRecentlyPlayed } = usePlayer();

  // Refs for scrollable containers
  const genresScrollRef = useRef<HTMLDivElement>(null);
  const artistsScrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // State for scroll position tracking
  const [genresScrollState, setGenresScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: true,
  });
  const [artistsScrollState, setArtistsScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: true,
  });

  // Check scroll position
  const checkScrollPosition = (
    container: HTMLDivElement | null,
    setState: (state: {
      canScrollLeft: boolean;
      canScrollRight: boolean;
    }) => void
  ) => {
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setState({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
    });
  };

  // Use SWR hooks for data fetching
  const { songs, isLoading: songsLoading } = useSongs({ isPublished: true });
  const { artists, isLoading: artistsLoading } = useArtists();
  const { playlists, isLoading: playlistsLoading } = usePlaylists({
    isPublic: true,
  });
  const { genres, isLoading: genresLoading } = useGenres();

  // Scroll handlers
  const scrollGenres = (direction: "left" | "right") => {
    if (!genresScrollRef.current) return;
    const scrollAmount = genresScrollRef.current.clientWidth * 0.8;
    const newScrollLeft =
      genresScrollRef.current.scrollLeft +
      (direction === "right" ? scrollAmount : -scrollAmount);
    genresScrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

  const scrollArtists = (direction: "left" | "right") => {
    if (!artistsScrollRef.current) return;
    const scrollAmount = artistsScrollRef.current.clientWidth * 0.8;
    const newScrollLeft =
      artistsScrollRef.current.scrollLeft +
      (direction === "right" ? scrollAmount : -scrollAmount);
    artistsScrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

  // Update scroll state on scroll
  useEffect(() => {
    // Only initialize once when containers are available and data is loaded
    if (initializedRef.current || genres.length === 0 || artists.length === 0) {
      return;
    }

    const genresContainer = genresScrollRef.current;
    const artistsContainer = artistsScrollRef.current;

    if (!genresContainer && !artistsContainer) return;

    const handleGenresScroll = () => {
      if (genresContainer) {
        checkScrollPosition(genresContainer, setGenresScrollState);
      }
    };

    const handleArtistsScroll = () => {
      if (artistsContainer) {
        checkScrollPosition(artistsContainer, setArtistsScrollState);
      }
    };

    if (genresContainer) {
      genresContainer.addEventListener("scroll", handleGenresScroll);
      // Initial check after a delay to ensure DOM is ready
      setTimeout(() => handleGenresScroll(), 100);
    }

    if (artistsContainer) {
      artistsContainer.addEventListener("scroll", handleArtistsScroll);
      // Initial check after a delay to ensure DOM is ready
      setTimeout(() => handleArtistsScroll(), 100);
    }

    // Check on resize with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        handleGenresScroll();
        handleArtistsScroll();
      }, 150);
    };
    window.addEventListener("resize", handleResize);

    initializedRef.current = true;

    return () => {
      clearTimeout(resizeTimeout);
      if (genresContainer) {
        genresContainer.removeEventListener("scroll", handleGenresScroll);
      }
      if (artistsContainer) {
        artistsContainer.removeEventListener("scroll", handleArtistsScroll);
      }
      window.removeEventListener("resize", handleResize);
      initializedRef.current = false;
    };
  }, [genres.length, artists.length]); // Only depend on lengths, not the arrays themselves

  const loading =
    songsLoading || artistsLoading || playlistsLoading || genresLoading;

  // Get recently played songs and filter to only include songs that exist in the current songs list
  const recentlyPlayed = useMemo(() => {
    const played = getRecentlyPlayed();
    // Filter to only include songs that are in the current songs list (in case songs were deleted)
    const songIds = new Set(songs.map((s) => s.id));
    const validPlayed = played.filter((song) => songIds.has(song.id));

    // Deduplicate songs (keep only the first occurrence - most recent play)
    const seenIds = new Set<string>();
    const uniquePlayed = validPlayed.filter((song) => {
      if (seenIds.has(song.id)) return false;
      seenIds.add(song.id);
      return true;
    });

    // Map to full song objects from the current songs list to ensure we have latest data
    return uniquePlayed
      .map((playedSong) => songs.find((s) => s.id === playedSong.id))
      .filter((song): song is Song => song !== undefined)
      .slice(0, 6); // Show only the 6 most recent
  }, [getRecentlyPlayed, songs]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/30 via-primary/10 to-card p-6 md:p-8 lg:p-10 myanmar-pattern">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <span className="text-sm font-medium">Featured Today</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 text-balance">
            Discover Myanmar's Musical Soul
          </h1>
          <p className="text-muted-foreground mb-6 text-balance">
            From ancient melodies to modern beats — experience the rich tapestry
            of Myanmar music with synchronized lyrics.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              onClick={() => songs[0] && onPlaySong(songs[0])}
              disabled={songs.length === 0}
            >
              <Play className="w-5 h-5 mr-2" />
              Play Featured
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("search")}
            >
              Explore All
            </Button>
          </div>
        </div>
        {/* Decorative Element */}
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 pointer-events-none">
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary blur-3xl" />
        </div>
      </section>

      {/* Quick Play Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Quick Play
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {songs.slice(0, 4).map((song) => (
            <div
              key={song.id}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-accent transition-all text-left cursor-pointer relative",
                currentSong?.id === song.id &&
                  "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              <button
                onClick={() => onPlaySong(song)}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="relative">
                  <Image
                    src={
                      song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
                    }
                    alt={song.title}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-md object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-md transition-opacity">
                    {currentSong?.id === song.id && isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm text-start">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate text-start">
                    {song.artist}
                  </p>
                </div>
              </button>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <AddToPlaylistDialog songId={song.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Browse Genres */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Browse Genres
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="relative">
          {/* Left scroll button */}
          {genresScrollState.canScrollLeft && (
            <button
              onClick={() => scrollGenres("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center transition-opacity"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {/* Scrollable container */}
          <div
            ref={genresScrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {genres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => navigate("genre", genre.id)}
                className="group relative aspect-square w-40 md:w-48 lg:w-56 shrink-0 rounded-xl overflow-hidden cursor-pointer"
              >
                <Image
                  src={genre.imageUrl || "/placeholder.svg"}
                  alt={genre.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white">{genre.name}</h3>
                </div>
              </button>
            ))}
          </div>
          {/* Right scroll button */}
          {genresScrollState.canScrollRight && (
            <button
              onClick={() => scrollGenres("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center transition-opacity"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </section>

      {/* Popular Artists */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Popular Artists
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="relative">
          {/* Left scroll button */}
          {artistsScrollState.canScrollLeft && (
            <button
              onClick={() => scrollArtists("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center transition-opacity"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {/* Scrollable container */}
          <div
            ref={artistsScrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {artists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => navigate("artist", artist.id)}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors cursor-pointer shrink-0 w-32 md:w-36"
              >
                <div className="relative">
                  <Image
                    src={artist.imageUrl || "/placeholder.svg"}
                    alt={artist.name}
                    width={112}
                    height={112}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-md object-cover shadow-lg group-hover:shadow-xl transition-shadow"
                    unoptimized
                  />
                  <div className="absolute inset-0 rounded-md ring-2 ring-primary/0 group-hover:ring-primary/50 transition-all" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm truncate max-w-[100px]">
                    {artist.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Artist</p>
                </div>
              </button>
            ))}
          </div>
          {/* Right scroll button */}
          {artistsScrollState.canScrollRight && (
            <button
              onClick={() => scrollArtists("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center transition-opacity"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </section>

      {/* Featured Playlists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Featured Playlists
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {playlists.map((playlist) => {
            // Get up to 4 song covers for the composite image
            const songCovers = playlist.songs
              .slice(0, 4)
              .map(song => song.albumCoverUrl || song.coverUrl)
              .filter(url => url && url !== "/placeholder.svg");

            return (
              <button
                key={playlist.id}
                onClick={() => navigate("playlist", playlist.id)}
                className="group text-left cursor-pointer"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg bg-muted">
                  {songCovers.length > 0 ? (
                    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                      {songCovers.map((coverUrl, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={coverUrl}
                            alt={`${playlist.name} song ${index + 1}`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
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
                  ) : (
                    // Fallback to single cover or placeholder
                    <Image
                      src={playlist.coverUrl || "/placeholder.svg"}
                      alt={playlist.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  )}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-xl">
                      <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold truncate">{playlist.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {playlist.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Recently Played
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentlyPlayed.map((song) => (
              <div key={song.id} className="group text-left relative">
                <button
                  onClick={() => onPlaySong(song)}
                  className="w-full"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
                    <Image
                      src={
                        song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
                      }
                      alt={song.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {currentSong?.id === song.id && isPlaying ? (
                        <Pause className="w-10 h-10 text-white" />
                      ) : (
                        <Play className="w-10 h-10 text-white" />
                      )}
                    </div>
                    {song.isPremium && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        Premium
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-sm truncate">{song.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {song.artist}
                  </p>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
