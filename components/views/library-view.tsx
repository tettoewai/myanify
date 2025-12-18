"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { ListMusic, Heart, Clock, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Song } from "@/lib/types";
import { useNavigation } from "@/lib/navigation";
import { usePlaylists, useSongs, useLikedSongs, usePlayHistory } from "@/lib/swr";

interface LibraryViewProps {
  onPlaySong: (song: Song) => void;
}

export function LibraryView({ onPlaySong }: LibraryViewProps) {
  const { data: session } = useSession();
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState("playlists");

  // Use SWR hooks for data fetching
  const { playlists } = usePlaylists({ isPublic: true });
  const { songs } = useSongs({ isPublished: true });
  
  // Fetch liked songs from database
  const { songs: likedSongs } = useLikedSongs({ enabled: !!session?.user?.id });
  
  // Fetch recent play history from database
  const { songs: recentSongsRaw } = usePlayHistory({ limit: 50, enabled: !!session?.user?.id });
  
  // Deduplicate recent songs (keep only the first occurrence - most recent play)
  const recentSongs = useMemo(() => {
    const seenIds = new Set<string>();
    return recentSongsRaw.filter((song) => {
      if (seenIds.has(song.id)) return false;
      seenIds.add(song.id);
      return true;
    });
  }, [recentSongsRaw]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Your Library
        </h1>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </Button>
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
            value="recent"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Clock className="w-4 h-4 mr-2" />
            Recent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Create Playlist Card */}
            <button className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-card/50 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground cursor-pointer">
              <Plus className="w-12 h-12" />
              <span className="font-medium">Create Playlist</span>
            </button>

            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => navigate("playlist", playlist.id)}
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
        </TabsContent>

        <TabsContent value="liked" className="mt-6">
          {/* Liked Songs Header */}
          <div className="flex items-center gap-6 p-6 rounded-xl bg-gradient-to-br from-primary/30 to-card mb-6">
            <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl">
              <Heart className="w-16 h-16 text-white fill-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Playlist</p>
              <h2 className="text-3xl font-bold mb-2">Liked Songs</h2>
              <p className="text-muted-foreground">{likedSongs.length} songs</p>
            </div>
          </div>

          {/* Liked Songs List */}
          <div className="space-y-2">
            {likedSongs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => onPlaySong(song)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer"
              >
                <span className="w-6 text-center text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <Image
                  src={
                    song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
                  }
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
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <div className="space-y-2">
            {(recentSongs.length > 0 ? recentSongs : songs).map((song, index) => (
              <button
                key={song.id}
                onClick={() => onPlaySong(song)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group cursor-pointer"
              >
                <span className="w-6 text-center text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <Image
                  src={
                    song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
                  }
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
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
