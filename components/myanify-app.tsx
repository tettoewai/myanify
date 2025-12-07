"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { MainContent } from "./main-content"
import { PlayerBar } from "./player-bar"
import { LyricsPanel } from "./lyrics-panel"
import { MobileNav } from "./mobile-nav"
import { MobileNowPlaying } from "./mobile-now-playing"
import { FullscreenLyrics } from "./fullscreen-lyrics"
import { mockSongs } from "@/lib/mock-data"
import type { Song } from "@/lib/types"

export type ViewType = "home" | "search" | "library" | "genre" | "artist" | "playlist" | "premium"

export function MyanifyApp() {
  const [currentView, setCurrentView] = useState<ViewType>("home")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(mockSongs[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [queue, setQueue] = useState<Song[]>(mockSongs)
  const [isPremium, setIsPremium] = useState(false)

  const handleNavigate = (view: ViewType, id?: string) => {
    setCurrentView(view)
    setSelectedId(id || null)
  }

  const handlePlaySong = (song: Song) => {
    if (song.isPremium && !isPremium) {
      setCurrentView("premium")
      return
    }
    setCurrentSong(song)
    setIsPlaying(true)
    setCurrentTime(0)
  }

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleNextSong = () => {
    if (!currentSong) return
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
    const nextSong = queue[(currentIndex + 1) % queue.length]
    handlePlaySong(nextSong)
  }

  const handlePrevSong = () => {
    if (!currentSong) return
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id)
    const prevSong = queue[(currentIndex - 1 + queue.length) % queue.length]
    handlePlaySong(prevSong)
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar currentView={currentView} onNavigate={handleNavigate} isPremium={isPremium} />
        </div>

        {/* Main Content */}
        <MainContent
          currentView={currentView}
          selectedId={selectedId}
          onNavigate={handleNavigate}
          onPlaySong={handlePlaySong}
          currentSong={currentSong}
          isPlaying={isPlaying}
          isPremium={isPremium}
          onUpgradePremium={() => setIsPremium(true)}
        />

        {/* Lyrics Panel - Desktop sidebar */}
        {showLyrics && currentSong && (
          <LyricsPanel song={currentSong} currentTime={currentTime} onClose={() => setShowLyrics(false)} />
        )}
      </div>

      {/* Player Bar - Desktop */}
      <PlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextSong}
        onPrev={handlePrevSong}
        onTimeChange={setCurrentTime}
        showLyrics={showLyrics}
        onToggleLyrics={() => setShowLyrics(!showLyrics)}
        isPremium={isPremium}
        onOpenFullscreenLyrics={() => setShowFullscreenLyrics(true)}
      />

      {currentSong && (
        <MobileNowPlaying
          song={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onTogglePlay={handleTogglePlay}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onTimeChange={setCurrentTime}
        />
      )}

      {showFullscreenLyrics && currentSong && (
        <FullscreenLyrics
          song={currentSong}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onClose={() => setShowFullscreenLyrics(false)}
          onTogglePlay={handleTogglePlay}
          onNext={handleNextSong}
          onPrev={handlePrevSong}
          onTimeChange={setCurrentTime}
        />
      )}

      {/* Mobile Navigation */}
      <MobileNav currentView={currentView} onNavigate={handleNavigate} />
    </div>
  )
}
