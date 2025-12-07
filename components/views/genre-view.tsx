"use client"

import { ArrowLeft, Play, Pause, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockGenres, mockSongs } from "@/lib/mock-data"
import type { Song } from "@/lib/types"
import type { ViewType } from "../myanify-app"
import { cn } from "@/lib/utils"

interface GenreViewProps {
  genreId: string
  onPlaySong: (song: Song) => void
  currentSong: Song | null
  isPlaying: boolean
  onNavigate: (view: ViewType, id?: string) => void
}

export function GenreView({ genreId, onPlaySong, currentSong, isPlaying, onNavigate }: GenreViewProps) {
  const genre = mockGenres.find((g) => g.id === genreId)
  const genreSongs = mockSongs.filter((s) => s.genre === genre?.name)

  if (!genre) return null

  return (
    <div className="min-h-full">
      {/* Genre Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img src={genre.imageUrl || "/placeholder.svg"} alt={genre.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate("home")}
            className="bg-black/20 hover:bg-black/40 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <p className="text-sm text-muted-foreground mb-1">Genre</p>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">{genre.name}</h1>
          <p className="text-muted-foreground">{genre.description}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Button
          size="lg"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/20"
          onClick={() => genreSongs[0] && onPlaySong(genreSongs[0])}
        >
          <Play className="w-5 h-5 mr-2" />
          Play
        </Button>
        <Button size="lg" variant="outline" className="rounded-full bg-transparent">
          <Shuffle className="w-5 h-5 mr-2" />
          Shuffle
        </Button>
      </div>

      {/* Songs List */}
      <div className="px-4 md:px-8 pb-8">
        <div className="space-y-2">
          {genreSongs.length > 0 ? (
            genreSongs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => onPlaySong(song)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-card transition-colors group",
                  currentSong?.id === song.id && "bg-primary/10",
                )}
              >
                <span className="w-6 text-center text-sm text-muted-foreground group-hover:hidden">{index + 1}</span>
                <span className="w-6 hidden group-hover:flex items-center justify-center">
                  {currentSong?.id === song.id && isPlaying ? (
                    <Pause className="w-4 h-4 text-primary" />
                  ) : (
                    <Play className="w-4 h-4 text-primary" />
                  )}
                </span>
                <img
                  src={song.coverUrl || "/placeholder.svg"}
                  alt={song.title}
                  className="w-12 h-12 rounded-md object-cover"
                />
                <div className="flex-1 text-left min-w-0">
                  <p className={cn("font-medium truncate", currentSong?.id === song.id && "text-primary")}>
                    {song.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                </span>
                {song.isPremium && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                    Premium
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">No songs in this genre yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
