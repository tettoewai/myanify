"use client"

import { HomeView } from "./views/home-view"
import { SearchView } from "./views/search-view"
import { LibraryView } from "./views/library-view"
import { GenreView } from "./views/genre-view"
import { ArtistView } from "./views/artist-view"
import { PlaylistView } from "./views/playlist-view"
import { PremiumView } from "./views/premium-view"
import type { ViewType } from "./myanify-app"
import type { Song } from "@/lib/types"
import { AdBanner } from "./ad-banner"

interface MainContentProps {
  currentView: ViewType
  selectedId: string | null
  onNavigate: (view: ViewType, id?: string) => void
  onPlaySong: (song: Song) => void
  currentSong: Song | null
  isPlaying: boolean
  isPremium: boolean
  onUpgradePremium: () => void
}

export function MainContent({
  currentView,
  selectedId,
  onNavigate,
  onPlaySong,
  currentSong,
  isPlaying,
  isPremium,
  onUpgradePremium,
}: MainContentProps) {
  const renderView = () => {
    switch (currentView) {
      case "home":
        return (
          <HomeView onNavigate={onNavigate} onPlaySong={onPlaySong} currentSong={currentSong} isPlaying={isPlaying} />
        )
      case "search":
        return (
          <SearchView onNavigate={onNavigate} onPlaySong={onPlaySong} currentSong={currentSong} isPlaying={isPlaying} />
        )
      case "library":
        return <LibraryView onNavigate={onNavigate} onPlaySong={onPlaySong} />
      case "genre":
        return (
          <GenreView
            genreId={selectedId!}
            onPlaySong={onPlaySong}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onNavigate={onNavigate}
          />
        )
      case "artist":
        return (
          <ArtistView
            artistId={selectedId!}
            onPlaySong={onPlaySong}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onNavigate={onNavigate}
          />
        )
      case "playlist":
        return (
          <PlaylistView
            playlistId={selectedId!}
            onPlaySong={onPlaySong}
            currentSong={currentSong}
            isPlaying={isPlaying}
          />
        )
      case "premium":
        return <PremiumView onUpgrade={onUpgradePremium} isPremium={isPremium} />
      default:
        return null
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-background">
      <div className="min-h-full pb-32">
        {renderView()}

        {/* Ad Banner for free users */}
        {!isPremium && currentView !== "premium" && <AdBanner />}
      </div>
    </main>
  )
}
