"use client";

import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { AlbumTypeBadge } from "@/components/album-type-badge";
import { HomePageSkeleton } from "@/components/loading-skeletons";
import { usePlayer } from "@/components/player-context";
import { SongContextMenu } from "@/components/song-context-menu";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/lib/navigation";
import {
  useAlbums,
  useArtists,
  useGenres,
  usePlayHistory,
  usePlaylists,
  useQuickPlaySongs,
  useSongs,
} from "@/lib/swr";
import type { Album, Song } from "@/lib/types";
import { cn, getSongCoverUrl, isPlaceholderCoverUrl } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Pause,
  Play,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

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
  const { data: session } = useSession();
  const { isSongQueued, playFromContext } = usePlayer();

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
    }) => void,
  ) => {
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setState({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
    });
  };

  // Use SWR hooks for data fetching
  const {
    songs: quickPlaySongs,
    featuredSong,
    isLoading: quickPlayLoading,
  } = useQuickPlaySongs(4);
  const { artists, isLoading: artistsLoading } = useArtists();
  const { playlists, isLoading: playlistsLoading } = usePlaylists({
    isPublic: true,
  });
  const { genres, isLoading: genresLoading } = useGenres();
  const { albums, isLoading: albumsLoading } = useAlbums({
    limit: 4,
    sort: "recent",
  });
  const { songs: recentlyPlayed } = usePlayHistory({
    limit: 4,
    enabled: !!session?.user?.id,
  });
  const { songs: newReleases } = useSongs({ limit: 8 });

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
    quickPlayLoading || artistsLoading || playlistsLoading || genresLoading;

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/30 via-primary/10 to-card p-6 md:p-8 lg:p-10 myanmar-pattern">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              Featured Today
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 text-balance">
            Discover Myanmar's Musical Soul
          </h1>
          <p className="text-muted-foreground mb-6 text-balance">
            From ancient melodies to modern beats — experience the rich tapestry
            of Myanmar music with synchronized lyrics.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow rounded-full"
              onClick={() => featuredSong && onPlaySong(featuredSong)}
              disabled={!featuredSong}
            >
              <Play className="w-5 h-5 mr-2" />
              Play Featured
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full"
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
          {quickPlaySongs.map((song) => (
            <SongContextMenu key={song.id} song={song}>
              <div
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-accent transition-all text-left cursor-pointer relative min-w-0",
                  currentSong?.id === song.id &&
                    "bg-primary/10 ring-1 ring-primary/30 hover:bg-primary/15",
                )}
              >
                <button
                  onClick={() => onPlaySong(song)}
                  className="flex items-center gap-3 flex-1 min-w-0 pr-6 sm:pr-7"
                >
                  <div className="relative shrink-0">
                    <Image
                      src={getSongCoverUrl(song)}
                      alt={song.title}
                      width={56}
                      height={56}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-md transition-opacity">
                      {currentSong?.id === song.id && isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </div>
                    {currentSong?.id === song.id && isPlaying && (
                      <div className="absolute inset-0 rounded-md ring-2 ring-primary/60 group-hover:opacity-0 transition-opacity" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p
                      className={cn(
                        "font-medium truncate text-sm text-start",
                        currentSong?.id === song.id && "text-primary",
                      )}
                    >
                      {song.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate text-start">
                      {song.artist}
                    </p>
                  </div>
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {isSongQueued(song.id) && (
                    <ListMusic className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                    <AddToPlaylistDialog songId={song.id} />
                  </div>
                </div>
              </div>
            </SongContextMenu>
          ))}
        </div>
      </section>

      {/* New Releases */}
      {newReleases.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              New Releases
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("see-all", "new-releases")}
            >
              See All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newReleases.map((song) => (
              <SongContextMenu key={song.id} song={song}>
                <div
                  className={cn(
                    "group text-left relative w-full min-w-0",
                    currentSong?.id === song.id &&
                      "ring-1 ring-primary/30 rounded-xl",
                  )}
                >
                  <button
                    onClick={() =>
                      playFromContext(song, newReleases, "playlist")
                    }
                    className="w-full min-w-0 cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
                      <Image
                        src={getSongCoverUrl(song)}
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
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "font-medium text-sm truncate",
                          currentSong?.id === song.id && "text-primary",
                        )}
                      >
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>
                  </button>
                </div>
              </SongContextMenu>
            ))}
          </div>
        </section>
      )}

      {/* Browse Genres */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Browse Genres
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("see-all", "genres")}
          >
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
                onClick={() => navigate("genre", genre.slug)}
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
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("see-all", "artists")}
          >
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
                onClick={() => navigate("artist", artist.slug)}
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
                  {artist.monthlyListeners > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {artist.monthlyListeners >= 1000
                        ? `${(artist.monthlyListeners / 1000).toFixed(0)}K`
                        : artist.monthlyListeners}{" "}
                      listeners
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Artist</p>
                  )}
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

      {/* Albums */}
      {!albumsLoading && albums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Albums & Releases
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("see-all", "albums")}
            >
              See All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {albums.map((album: Album) => (
              <button
                key={album.id}
                onClick={() => navigate("album", album.slug)}
                className="group text-left cursor-pointer"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg">
                  <Image
                    src={album.coverUrl || "/placeholder.svg"}
                    alt={album.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <div className="absolute top-2 left-2">
                    <AlbumTypeBadge type={album.type} />
                  </div>
                </div>
                <h3 className="font-semibold truncate">{album.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {album.releaseDate && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(album.releaseDate).getFullYear()}
                    </p>
                  )}
                  {(album as any)._count?.songs != null && (
                    <p className="text-sm text-muted-foreground">
                      {album.releaseDate ? "·" : ""}{" "}
                      {(album as any)._count.songs} songs
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Featured Playlists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Featured Playlists
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("see-all", "playlists")}
          >
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {playlists.map((playlist) => {
            // Get up to 4 song covers for the composite image
            const songCovers = playlist.songs
              .slice(0, 4)
              .map((song) => getSongCoverUrl(song))
              .filter((url) => !isPlaceholderCoverUrl(url));

            return (
              <button
                key={playlist.id}
                onClick={() => navigate("playlist", playlist.slug)}
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
                      {Array.from({ length: 4 - songCovers.length }).map(
                        (_, index) => (
                          <div
                            key={`placeholder-${index}`}
                            className="relative bg-muted flex items-center justify-center"
                          >
                            <div className="w-8 h-8 rounded bg-muted-foreground/20" />
                          </div>
                        ),
                      )}
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
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("see-all", "recently-played")}
            >
              See All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recentlyPlayed.map((song) => (
              <SongContextMenu key={song.id} song={song}>
                <div
                  className={cn(
                    "group text-left relative w-full min-w-0",
                    currentSong?.id === song.id &&
                      "ring-1 ring-primary/30 rounded-xl",
                  )}
                >
                  <button
                    onClick={() =>
                      playFromContext(song, recentlyPlayed, "playlist")
                    }
                    className="w-full min-w-0 cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
                      <Image
                        src={getSongCoverUrl(song)}
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
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "font-medium text-sm truncate",
                          currentSong?.id === song.id && "text-primary",
                        )}
                      >
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>
                  </button>
                </div>
              </SongContextMenu>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
