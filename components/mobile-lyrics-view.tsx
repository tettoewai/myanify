"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  Heart,
  Share2,
  Languages,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  MoreHorizontal,
  ListMusic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { Song } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MobileLyricsViewProps {
  song: Song
  currentTime: number
  isPlaying: boolean
  onClose: () => void
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onTimeChange: (time: number) => void
}

export function MobileLyricsView({
  song,
  currentTime,
  isPlaying,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeChange,
}: MobileLyricsViewProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  const [showLyrics, setShowLyrics] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const [isLiked, setIsLiked] = useState(false)

  const currentLyricIndex = song.lyrics.reduce((prevIndex, curr, index) => {
    if (curr.time <= currentTime) return index
    return prevIndex
  }, 0)

  useEffect(() => {
    if (activeRef.current && showLyrics) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [currentLyricIndex, showLyrics])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col">
      {/* Background with album art blur */}
      <div
        className="absolute inset-0 opacity-40 blur-3xl scale-125"
        style={{
          backgroundImage: `url(${song.coverUrl || "/placeholder.svg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-safe">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
        >
          <ChevronDown className="w-7 h-7" />
        </Button>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-amber-400/80 font-medium">Now Playing</p>
        </div>

        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 rounded-full">
          <MoreHorizontal className="w-6 h-6" />
        </Button>
      </div>

      {/* Main content area - switches between album art and lyrics */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {showLyrics ? (
          /* Lyrics View */
          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-[20vh]">
              {song.lyrics.length > 0 ? (
                <div className="space-y-8">
                  {song.lyrics.map((line, index) => {
                    const isActive = index === currentLyricIndex
                    const isPast = index < currentLyricIndex

                    return (
                      <div
                        key={index}
                        ref={isActive ? activeRef : null}
                        className={cn(
                          "transition-all duration-500 text-center",
                          isPast && "opacity-30",
                          !isActive && !isPast && "opacity-50",
                        )}
                      >
                        <p
                          className={cn(
                            "text-xl leading-relaxed font-medium transition-all duration-500",
                            isActive ? "text-white text-2xl" : "text-white/70",
                          )}
                        >
                          {line.text}
                        </p>

                        {line.translation && showTranslation && (
                          <p
                            className={cn(
                              "text-sm mt-2 transition-all duration-500 italic",
                              isActive ? "text-amber-400/80" : "text-white/40",
                            )}
                          >
                            {line.translation}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-white/60">No lyrics available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Album Art View */
          <div className="flex-1 flex items-center justify-center px-12">
            <div className="relative w-full max-w-xs aspect-square">
              <img
                src={song.coverUrl || "/placeholder.svg"}
                alt={song.title}
                className="w-full h-full rounded-2xl object-cover shadow-2xl"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="relative z-10 px-6 pb-safe bg-gradient-to-t from-stone-950 to-transparent pt-8">
        {/* Toggle between lyrics and artwork */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center bg-white/10 rounded-full p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(false)}
              className={cn("rounded-full px-4 h-8 text-xs", !showLyrics ? "bg-white text-stone-900" : "text-white/70")}
            >
              Cover
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLyrics(true)}
              className={cn("rounded-full px-4 h-8 text-xs", showLyrics ? "bg-white text-stone-900" : "text-white/70")}
            >
              Lyrics
            </Button>
          </div>
          {showLyrics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslation(!showTranslation)}
              className={cn("ml-2 rounded-full px-3 h-8 text-xs", showTranslation ? "text-amber-400" : "text-white/50")}
            >
              <Languages className="w-4 h-4 mr-1" />
              EN
            </Button>
          )}
        </div>

        {/* Song info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xl text-white truncate">{song.title}</p>
            <p className="text-amber-400/80 truncate">{song.artist}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLiked(!isLiked)}
            className="text-white/70 hover:text-white rounded-full"
          >
            <Heart className={cn("w-6 h-6", isLiked && "fill-amber-400 text-amber-400")} />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            max={song.duration}
            step={1}
            onValueChange={(v) => onTimeChange(v[0])}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_.bg-primary]:bg-amber-400"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-white/50 font-mono">{formatTime(currentTime)}</span>
            <span className="text-xs text-white/50 font-mono">{formatTime(song.duration)}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white rounded-full">
            <Shuffle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            className="text-white hover:text-white rounded-full w-12 h-12"
          >
            <SkipBack className="w-7 h-7" />
          </Button>
          <Button
            size="icon"
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-900 shadow-xl shadow-amber-500/30"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="text-white hover:text-white rounded-full w-12 h-12"
          >
            <SkipForward className="w-7 h-7" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white rounded-full">
            <Repeat className="w-5 h-5" />
          </Button>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-8">
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-xs gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white text-xs gap-2">
            <ListMusic className="w-4 h-4" />
            Queue
          </Button>
        </div>
      </div>
    </div>
  )
}
