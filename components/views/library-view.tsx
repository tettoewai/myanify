"use client"

import { useState } from "react"
import { ListMusic, Heart, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockPlaylists, mockSongs } from "@/lib/mock-data"
import type { Song } from "@/lib/types"
import type { ViewType } from "../myanify-app"

interface LibraryViewProps {
  onNavigate: (view: ViewType, id?: string) => void
  onPlaySong: (song: Song) => void
}

export function LibraryView({ onNavigate, onPlaySong }: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState("playlists")
  const likedSongs = mockSongs.slice(0, 5)

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Your Library</h1>
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
            <button className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-card/50 transition-all flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground">
              <Plus className="w-12 h-12" />
              <span className="font-medium">Create Playlist</span>
            </button>

            {mockPlaylists.map((playlist) => (
              <button key={playlist.id} onClick={() => onNavigate("playlist", playlist.id)} className="group text-left">
                <div className="aspect-square rounded-xl overflow-hidden mb-3 shadow-lg">
                  <img
                    src={playlist.coverUrl || "/placeholder.svg"}
                    alt={playlist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-semibold truncate">{playlist.name}</h3>
                <p className="text-sm text-muted-foreground">{playlist.songs.length} songs</p>
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
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group"
              >
                <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
                <img
                  src={song.coverUrl || "/placeholder.svg"}
                  alt={song.title}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <Heart className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm text-muted-foreground">
                  {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <div className="space-y-2">
            {mockSongs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => onPlaySong(song)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group"
              >
                <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
                <img
                  src={song.coverUrl || "/placeholder.svg"}
                  alt={song.title}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{song.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
