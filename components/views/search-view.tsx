"use client"

import { useState, useMemo } from "react"
import { Search, Play, Pause, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { mockSongs, mockArtists, mockGenres } from "@/lib/mock-data"
import type { Song } from "@/lib/types"
import type { ViewType } from "../myanify-app"
import { cn } from "@/lib/utils"

interface SearchViewProps {
  onNavigate: (view: ViewType, id?: string) => void
  onPlaySong: (song: Song) => void
  currentSong: Song | null
  isPlaying: boolean
}

export function SearchView({ onNavigate, onPlaySong, currentSong, isPlaying }: SearchViewProps) {
  const [query, setQuery] = useState("")

  const filteredSongs = useMemo(() => {
    if (!query.trim()) return []
    const lowerQuery = query.toLowerCase()
    return mockSongs.filter(
      (song) => song.title.toLowerCase().includes(lowerQuery) || song.artist.toLowerCase().includes(lowerQuery),
    )
  }, [query])

  const filteredArtists = useMemo(() => {
    if (!query.trim()) return []
    const lowerQuery = query.toLowerCase()
    return mockArtists.filter((artist) => artist.name.toLowerCase().includes(lowerQuery))
  }, [query])

  const hasResults = filteredSongs.length > 0 || filteredArtists.length > 0
  const showBrowse = !query.trim()

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      {/* Search Header */}
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Search</h1>
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
              onClick={() => setQuery("")}
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
            {mockGenres.map((genre) => (
              <button
                key={genre.id}
                onClick={() => onNavigate("genre", genre.id)}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden"
              >
                <img
                  src={genre.imageUrl || "/placeholder.svg"}
                  alt={genre.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
      {query && !hasResults && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No results found for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-2">Try searching for a different song or artist</p>
        </div>
      )}

      {/* Artists Results */}
      {filteredArtists.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredArtists.map((artist) => (
              <button
                key={artist.id}
                onClick={() => onNavigate("artist", artist.id)}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-card transition-colors"
              >
                <img
                  src={artist.imageUrl || "/placeholder.svg"}
                  alt={artist.name}
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
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
      {filteredSongs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4">Songs</h2>
          <div className="space-y-2">
            {filteredSongs.map((song, index) => (
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
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
