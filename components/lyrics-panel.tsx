"use client"

import { useEffect, useRef, useState } from "react"
import { X, Languages, Music2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Song } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LyricsPanelProps {
  song: Song
  currentTime: number
  onClose: () => void
}

export function LyricsPanel({ song, currentTime, onClose }: LyricsPanelProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showTranslation, setShowTranslation] = useState(true)

  const currentLyricIndex = song.lyrics.reduce((prevIndex, curr, index) => {
    if (curr.time <= currentTime) return index
    return prevIndex
  }, 0)

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [currentLyricIndex])

  return (
    <aside className="w-80 lg:w-[420px] h-full bg-gradient-to-b from-amber-950/20 via-background to-background border-l border-amber-900/20 flex-col hidden lg:flex">
      <div className="p-5 border-b border-amber-900/20 flex items-center justify-between bg-gradient-to-r from-amber-900/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Music2 className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Lyrics</h2>
            <p className="text-xs text-muted-foreground">Synced with music</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTranslation(!showTranslation)}
            className={cn("text-xs gap-1.5 h-8", showTranslation ? "text-amber-500" : "text-muted-foreground")}
          >
            <Languages className="w-4 h-4" />
            EN
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-5 border-b border-amber-900/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={song.coverUrl || "/placeholder.svg"}
              alt={song.title}
              className="w-16 h-16 rounded-xl object-cover shadow-xl ring-2 ring-amber-500/20"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lg truncate text-foreground">{song.title}</p>
            <p className="text-sm text-amber-500/80 truncate">{song.artist}</p>
            <p className="text-xs text-muted-foreground mt-1">{song.album}</p>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/30 scrollbar-track-transparent"
      >
        <div className="py-8 px-6">
          {song.lyrics.length > 0 ? (
            <div className="space-y-8">
              {song.lyrics.map((line, index) => {
                const isActive = index === currentLyricIndex
                const isPast = index < currentLyricIndex
                const isFuture = index > currentLyricIndex

                return (
                  <div
                    key={index}
                    ref={isActive ? activeRef : null}
                    className={cn(
                      "transition-all duration-500 ease-out relative group cursor-pointer",
                      isActive && "scale-100",
                      isPast && "opacity-40",
                      isFuture && "opacity-60",
                    )}
                  >
                    {/* Active indicator line */}
                    {isActive && (
                      <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 shadow-lg shadow-amber-500/50" />
                    )}

                    {/* Myanmar lyric text */}
                    <p
                      className={cn(
                        "text-xl leading-relaxed transition-all duration-500 font-medium",
                        isActive ? "text-amber-400 text-2xl" : isPast ? "text-muted-foreground" : "text-foreground/80",
                      )}
                    >
                      {line.text}
                    </p>

                    {/* English translation */}
                    {line.translation && showTranslation && (
                      <p
                        className={cn(
                          "text-sm mt-2 transition-all duration-500 italic",
                          isActive ? "text-amber-500/70" : "text-muted-foreground/60",
                        )}
                      >
                        "{line.translation}"
                      </p>
                    )}

                    {/* Subtle glow effect for active lyric */}
                    {isActive && <div className="absolute -inset-4 bg-amber-500/5 rounded-2xl -z-10 blur-xl" />}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-900/20 flex items-center justify-center mb-4">
                <Music2 className="w-10 h-10 text-amber-500/50" />
              </div>
              <p className="text-muted-foreground font-medium">No lyrics available</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Lyrics for this song haven't been added yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-amber-900/20 bg-gradient-to-t from-amber-950/10 to-transparent">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Auto-scrolling to current lyric</span>
        </div>
      </div>
    </aside>
  )
}
