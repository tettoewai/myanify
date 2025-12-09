"use client";

import { Play, Pause, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/types";
import { useNavigation } from "@/lib/navigation";
import { useSongs, useArtists, usePlaylists, useGenres } from "@/lib/swr";
import { cn } from "@/lib/utils";

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

  // Use SWR hooks for data fetching
  const { songs, isLoading: songsLoading } = useSongs({ isPublished: true });
  const { artists, isLoading: artistsLoading } = useArtists();
  const { playlists, isLoading: playlistsLoading } = usePlaylists({
    isPublic: true,
  });
  const { genres, isLoading: genresLoading } = useGenres();

  const loading =
    songsLoading || artistsLoading || playlistsLoading || genresLoading;

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
            <button
              key={song.id}
              onClick={() => onPlaySong(song)}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-accent transition-all text-left",
                currentSong?.id === song.id &&
                  "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              <div className="relative">
                <img
                  src={song.coverUrl || "/placeholder.svg"}
                  alt={song.title}
                  className="w-14 h-14 rounded-md object-cover"
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
                <p className="font-medium truncate text-sm">{song.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {song.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Browse Genres */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Browse Genres
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => navigate("genre", genre.id)}
              className="group relative aspect-square rounded-xl overflow-hidden"
            >
              <img
                src={genre.imageUrl || "/placeholder.svg"}
                alt={genre.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-bold text-white">{genre.name}</h3>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Popular Artists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Popular Artists
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            See All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <button
              key={artist.id}
              onClick={() => navigate("artist", artist.id)}
              className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors"
            >
              <div className="relative">
                <img
                  src={artist.imageUrl || "/placeholder.svg"}
                  alt={artist.name}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-md object-cover shadow-lg group-hover:shadow-xl transition-shadow"
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
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => navigate("playlist", playlist.id)}
              className="group text-left"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg">
                <img
                  src={playlist.coverUrl || "/placeholder.svg"}
                  alt={playlist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
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
          ))}
        </div>
      </section>

      {/* Recently Played */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Recently Played
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {songs.slice(0, 6).map((song) => (
            <button
              key={song.id}
              onClick={() => onPlaySong(song)}
              className="group text-left"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
                <img
                  src={song.coverUrl || "/placeholder.svg"}
                  alt={song.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
          ))}
        </div>
      </section>
    </div>
  );
}
