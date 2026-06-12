"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  ListMusic,
  Heart,
  Clock,
  Plus,
  Users,
  LogIn,
  History,
  Music,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Song } from "@/lib/types";
import { getSongCoverUrl } from "@/lib/utils";
import { useNavigation } from "@/lib/navigation";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";
import {
  usePlaylists,
  useLikedSongs,
  usePlayHistory,
  useLikedArtists,
} from "@/lib/swr";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import { SongContextMenu } from "@/components/song-context-menu";
import { usePlayer } from "@/components/player-context";

interface LibraryViewProps {
  onPlaySong: (song: Song) => void;
}

export function LibraryView({ onPlaySong }: LibraryViewProps) {
  const { data: session } = useSession();
  const { navigate } = useNavigation();
  const { playFromContext, isSongQueued } = usePlayer();
  const [activeTab, setActiveTab] = useState("playlists");

  // Use SWR hooks for data fetching
  const { playlists } = usePlaylists({
    userId: session?.user?.id,
    isPublic: true,
  });

  // Fetch liked songs from database
  const { songs: likedSongs } = useLikedSongs({ enabled: !!session?.user?.id });

  // Fetch liked artists from database
  const { artists: likedArtists } = useLikedArtists({
    enabled: !!session?.user?.id,
  });

  // Fetch recent play history from database
  const { songs: recentSongsRaw } = usePlayHistory({
    limit: 50,
    enabled: !!session?.user?.id,
  });

  // Deduplicate recent songs (keep only the first occurrence - most recent play)
  const recentSongs = useMemo(() => {
    const seenIds = new Set<string>();
    return recentSongsRaw.filter((song) => {
      if (seenIds.has(song.id)) return false;
      seenIds.add(song.id);
      return true;
    });
  }, [recentSongsRaw]);

  // Check if library is completely empty (user is signed in but has no content)
  const hasAnyContent =
    playlists.length > 0 ||
    likedSongs.length > 0 ||
    likedArtists.length > 0 ||
    recentSongs.length > 0;
  const isSignedIn = !!session?.user?.id;
  const showEmptyLibraryState = isSignedIn && !hasAnyContent;

  if (showEmptyLibraryState) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center justify-center gap-6 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <ListMusic className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Build Your Library
            </h2>
            <p className="text-muted-foreground mb-6">
              Your library is empty. Explore music, like songs, and create
              playlists to get started!
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              className="rounded-full bg-primary hover:bg-primary/90 w-full"
              onClick={() => navigate("home")}
            >
              <Music className="w-4 h-4 mr-2" />
              Explore Music
            </Button>
            <Button
              variant="outline"
              className="rounded-full w-full"
              onClick={() => {
                setActiveTab("playlists");
                // Scroll to tabs
                document
                  .querySelector('[role="tablist"]')
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Playlist
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Your Library
        </h1>
        <CreatePlaylistDialog />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="playlists"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ListMusic className="w-4 h-4 mr-2" />
            Playlists
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Heart className="w-4 h-4 mr-2" />
            Liked Songs
          </TabsTrigger>
          <TabsTrigger
            value="artists"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="w-4 h-4 mr-2" />
            Liked Artists
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Clock className="w-4 h-4 mr-2" />
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists" className="mt-6">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ListMusic className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">
                  No playlists yet
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first playlist to organize your music.
                </p>
              </div>
              <CreatePlaylistDialog
                trigger={
                  <Button className="rounded-full bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {/* Create Playlist Card */}
              <CreatePlaylistDialog
                trigger={
                  <button className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-card/50 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground cursor-pointer">
                    <Plus className="w-12 h-12" />
                    <span className="font-medium">Create Playlist</span>
                  </button>
                }
              />

              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => navigate("playlist", playlist.slug)}
                  className="group text-left cursor-pointer"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg">
                    <Image
                      src={playlist.coverUrl || "/placeholder.svg"}
                      alt={playlist.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  </div>
                  <h3 className="font-semibold truncate">{playlist.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist.songs.length} songs
                  </p>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked" className="mt-6">
          {!session?.user?.id ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">
                  Sign in to see your liked songs
                </p>
                <p className="text-sm text-muted-foreground">
                  Your favorites will appear here once you're signed in.
                </p>
              </div>
              <Button
                className="rounded-full bg-primary hover:bg-primary/90"
                onClick={() => navigate("home")}
              >
                Sign in
              </Button>
            </div>
          ) : (
            <>
              {/* Liked Songs Header */}
              <div className="flex items-center gap-6 p-6 rounded-xl bg-linear-to-br from-primary/30 to-card mb-6">
                <div className="w-32 h-32 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-xl">
                  <Heart className="w-16 h-16 text-white fill-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Playlist</p>
                  <h2 className="text-3xl font-bold mb-2">Liked Songs</h2>
                  <p className="text-muted-foreground">
                    {likedSongs.length} songs
                  </p>
                </div>
              </div>

              {likedSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Heart className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    No liked songs yet — tap the heart on any song to save it
                    here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {likedSongs.map((song, index) => (
                    <SongContextMenu key={song.id} song={song}>
                      <div className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer">
                        <button
                          onClick={() =>
                            playFromContext(song, likedSongs, "playlist")
                          }
                          className="flex items-center gap-4 flex-1 min-w-0"
                        >
                          <span className="w-6 text-center text-sm text-muted-foreground">
                            {index + 1}
                          </span>
                          <Image
                            src={getSongCoverUrl(song)}
                            alt={song.title}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-md object-cover"
                            unoptimized
                          />
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium truncate">{song.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {song.artist}
                            </p>
                          </div>
                          <Heart className="w-4 h-4 text-primary fill-primary" />
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(song.duration / 60)}:
                            {(song.duration % 60).toString().padStart(2, "0")}
                          </span>
                        </button>
                        {isSongQueued(song.id) && (
                          <ListMusic className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <AddToPlaylistDialog songId={song.id} />
                        </div>
                      </div>
                    </SongContextMenu>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="artists" className="mt-6">
          {!session?.user?.id ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">
                  Sign in to see your liked artists
                </p>
                <p className="text-sm text-muted-foreground">
                  Follow artists to find them here easily.
                </p>
              </div>
              <Button
                className="rounded-full bg-primary hover:bg-primary/90"
                onClick={() => navigate("home")}
              >
                Sign in
              </Button>
            </div>
          ) : (
            <>
              {/* Liked Artists Header */}
              <div className="flex items-center gap-6 p-6 rounded-xl bg-linear-to-br from-primary/30 to-card mb-6">
                <div className="w-32 h-32 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-xl">
                  <Users className="w-16 h-16 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Collection
                  </p>
                  <h2 className="text-3xl font-bold mb-2">Liked Artists</h2>
                  <p className="text-muted-foreground">
                    {likedArtists.length} artists
                  </p>
                </div>
              </div>

              {likedArtists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    No liked artists yet — tap the heart on an artist page to
                    follow them.
                  </p>
                </div>
              ) : (
                /* Liked Artists Grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {likedArtists.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => navigate("artist", artist.slug)}
                      className="group text-left cursor-pointer"
                    >
                      <div className="relative aspect-square rounded-xl overflow-hidden mb-3 shadow-lg">
                        <Image
                          src={artist.imageUrl || "/placeholder.svg"}
                          alt={artist.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                      <h3 className="font-semibold truncate">{artist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {artist.monthlyListeners?.toLocaleString()} monthly
                        listeners
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          {!session?.user?.id ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">
                  Sign in to see your play history
                </p>
                <p className="text-sm text-muted-foreground">
                  Songs you listen to will appear here.
                </p>
              </div>
              <Button
                className="rounded-full bg-primary hover:bg-primary/90"
                onClick={() => navigate("home")}
              >
                Sign in
              </Button>
            </div>
          ) : recentSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <History className="w-10 h-10 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">
                No recent plays yet
              </p>
              <p className="text-sm text-muted-foreground">
                Start listening to music and it will show up here.
              </p>
              <Button
                variant="outline"
                className="rounded-full mt-2"
                onClick={() => navigate("home")}
              >
                Browse music
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSongs.map((song, index) => (
                <SongContextMenu key={song.id} song={song}>
                  <button
                    onClick={() =>
                      playFromContext(song, recentSongs, "playlist")
                    }
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer"
                  >
                    <span className="w-6 text-center text-sm text-muted-foreground">
                      {index + 1}
                    </span>
                    <Image
                      src={getSongCoverUrl(song)}
                      alt={song.title}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-md object-cover"
                      unoptimized
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.artist}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.floor(song.duration / 60)}:
                      {(song.duration % 60).toString().padStart(2, "0")}
                    </span>
                  </button>
                </SongContextMenu>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
