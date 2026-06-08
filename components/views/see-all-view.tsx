"use client";

import Image from "next/image";
import { useMemo } from "react";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Album, Playlist, Song } from "@/lib/types";
import { useNavigation } from "@/lib/navigation";
import {
  useSongs,
  useArtists,
  useGenres,
  useAlbums,
  usePlaylists,
} from "@/lib/swr";
import {
  isSeeAllSection,
  SEE_ALL_SECTION_META,
  type SeeAllSection,
} from "@/lib/see-all-sections";
import { AlbumTypeBadge } from "@/components/album-type-badge";
import { usePlayer } from "@/components/player-context";
import { SongContextMenu } from "@/components/song-context-menu";
import { SeeAllPageSkeleton } from "@/components/loading-skeletons";
import { getSongCoverUrl, isPlaceholderCoverUrl } from "@/lib/utils";

interface SeeAllViewProps {
  section: string;
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

function PlaylistCover({ playlist }: { playlist: Playlist }) {
  const songCovers = playlist.songs
    .slice(0, 4)
    .map((song) => getSongCoverUrl(song))
    .filter((url) => !isPlaceholderCoverUrl(url));

  if (songCovers.length === 0) {
    return (
      <Image
        src={playlist.coverUrl || "/placeholder.svg"}
        alt={playlist.name}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
        unoptimized
      />
    );
  }

  return (
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
      {Array.from({ length: 4 - songCovers.length }).map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className="relative bg-muted flex items-center justify-center"
        >
          <div className="w-8 h-8 rounded bg-muted-foreground/20" />
        </div>
      ))}
    </div>
  );
}

export function SeeAllView({
  section,
  onPlaySong,
  currentSong,
  isPlaying,
}: SeeAllViewProps) {
  const { navigate, navigateBack } = useNavigation();
  const { getRecentlyPlayed } = usePlayer();

  const validSection: SeeAllSection | null = isSeeAllSection(section)
    ? section
    : null;

  const { genres, isLoading: genresLoading } = useGenres();
  const { artists, isLoading: artistsLoading } = useArtists();
  const { albums, isLoading: albumsLoading } = useAlbums();
  const { playlists, isLoading: playlistsLoading } = usePlaylists({
    isPublic: true,
  });
  const { songs, isLoading: songsLoading } = useSongs({ isPublished: true });

  const recentlyPlayed = useMemo(() => {
    if (validSection !== "recently-played") return [];

    const played = getRecentlyPlayed();
    const songIds = new Set(songs.map((s) => s.id));
    const validPlayed = played.filter((song) => songIds.has(song.id));

    const seenIds = new Set<string>();
    const uniquePlayed = validPlayed.filter((song) => {
      if (seenIds.has(song.id)) return false;
      seenIds.add(song.id);
      return true;
    });

    return uniquePlayed
      .map((playedSong) => songs.find((s) => s.id === playedSong.id))
      .filter((song): song is Song => song !== undefined);
  }, [getRecentlyPlayed, songs, validSection]);

  if (!validSection) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-full">
        <p className="text-muted-foreground">Section not found</p>
      </div>
    );
  }

  const meta = SEE_ALL_SECTION_META[validSection];
  const isLoading =
    (validSection === "genres" && genresLoading) ||
    (validSection === "artists" && artistsLoading) ||
    (validSection === "albums" && albumsLoading) ||
    (validSection === "playlists" && playlistsLoading) ||
    (validSection === "recently-played" && songsLoading);

  if (isLoading) {
    return <SeeAllPageSkeleton section={validSection} />;
  }

  const itemCount =
    validSection === "genres"
      ? genres.length
      : validSection === "artists"
        ? artists.length
        : validSection === "albums"
          ? albums.length
          : validSection === "playlists"
            ? playlists.length
            : recentlyPlayed.length;

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 space-y-6 pb-32">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateBack()}
          className="shrink-0 mt-1"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {meta.title}
          </h1>
          {meta.description && (
            <p className="text-muted-foreground mt-1">{meta.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {validSection === "genres" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => navigate("genre", genre.slug)}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Image
                src={genre.imageUrl || "/placeholder.svg"}
                alt={genre.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                <h3 className="font-bold text-white">{genre.name}</h3>
                {genre.description && (
                  <p className="text-sm text-white/70 line-clamp-2 mt-1">
                    {genre.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {validSection === "artists" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <button
              key={artist.id}
              onClick={() => navigate("artist", artist.slug)}
              className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
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
                <p className="font-semibold text-sm truncate max-w-[120px]">
                  {artist.name}
                </p>
                <p className="text-xs text-muted-foreground">Artist</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {validSection === "albums" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {albums.map((album: Album) => (
            <button
              key={album.id}
              onClick={() => navigate("album", album.slug)}
              className="group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
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
              {album.releaseDate && (
                <p className="text-sm text-muted-foreground">
                  {new Date(album.releaseDate).getFullYear()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {validSection === "playlists" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => navigate("playlist", playlist.slug)}
              className="group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg bg-muted">
                <PlaylistCover playlist={playlist} />
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
      )}

      {validSection === "recently-played" && (
        <>
          {recentlyPlayed.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No recently played songs yet
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Start listening and your history will show up here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recentlyPlayed.map((song) => (
                <SongContextMenu key={song.id} song={song}>
                  <div className="group text-left relative">
                    <button
                      onClick={() => onPlaySong(song)}
                      className="w-full focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
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
                      <h3 className="font-medium text-sm truncate">
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </button>
                  </div>
                </SongContextMenu>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
