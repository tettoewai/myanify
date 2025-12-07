"use client"

import { Play, Pause, Shuffle, Heart, MoreHorizontal, Clock, Share2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockPlaylists } from "@/lib/mock-data"
import type { Song } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PlaylistViewProps {
  playlistId: string
  onPlaySong: (song: Song) => void
  currentSong: Song | null
  isPlaying: boolean
}

export function PlaylistView({ playlistId, onPlaySong, currentSong, isPlaying }: PlaylistViewProps) {
  const playlist = mockPlaylists.find((p) => p.id === playlistId)

  if (!playlist) return null

  const totalDuration = playlist.songs.reduce((acc, song) => acc + song.duration, 0)
  const hours = Math.floor(totalDuration / 3600)
  const minutes = Math.floor((totalDuration % 3600) / 60)

  return (
    <div className="min-h-full">
      {/* Playlist Header */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-end bg-gradient-to-b from-primary/20 to-background">
        <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shadow-2xl flex-shrink-0">
          <img
            src={playlist.coverUrl || "/placeholder.svg"}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">Playlist</p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 text-balance">{playlist.name}</h1>
          <p className="text-muted-foreground mb-3">{playlist.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{playlist.createdBy}</span>
            <span>•</span>
            <span>{playlist.songs.length} songs</span>
            <span>•</span>
            <span>
              {hours > 0 ? `${hours} hr ` : ""}
              {minutes} min
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() => playlist.songs[0] && onPlaySong(playlist.songs[0])}
        >
          <Play className="w-5 h-5 mr-2" />
          Play
        </Button>
        <Button size="lg" variant="outline" className="rounded-full bg-transparent">
          <Shuffle className="w-5 h-5 mr-2" />
          Shuffle
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <Heart className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <Share2 className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <Pencil className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Songs Table Header */}
      <div className="hidden md:flex items-center gap-4 px-8 py-2 text-xs text-muted-foreground border-b border-border mx-4 md:mx-8">
        <span className="w-8 text-center">#</span>
        <span className="flex-1">Title</span>
        <span className="w-32">Album</span>
        <Clock className="w-4 h-4" />
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-8 pb-8">
        <div className="space-y-1">
          {playlist.songs.map((song, index) => (
            <button
              key={song.id}
              onClick={() => onPlaySong(song)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group",
                currentSong?.id === song.id && "bg-primary/10",
              )}
            >
              <span className="w-8 text-center text-sm text-muted-foreground group-hover:hidden">{index + 1}</span>
              <span className="w-8 hidden group-hover:flex items-center justify-center">
                {currentSong?.id === song.id && isPlaying ? (
                  <Pause className="w-4 h-4 text-primary" />
                ) : (
                  <Play className="w-4 h-4 text-primary" />
                )}
              </span>
              <img
                src={song.coverUrl || "/placeholder.svg"}
                alt={song.title}
                className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover"
              />
              <div className="flex-1 text-left min-w-0">
                <p className={cn("font-medium truncate", currentSong?.id === song.id && "text-primary")}>
                  {song.title}
                </p>
                <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
              </div>
              <span className="hidden md:block w-32 text-sm text-muted-foreground truncate">{song.album}</span>
              <span className="text-sm text-muted-foreground">
                {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
              </span>
              {song.isPremium && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">Premium</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
