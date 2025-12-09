"use client";

import { Sidebar } from "@/components/sidebar";
import { PlayerBar } from "@/components/player-bar";
import { LyricsPanel } from "@/components/lyrics-panel";
import { MobileNav } from "@/components/mobile-nav";
import { MobileNowPlaying } from "@/components/mobile-now-playing";
import { FullscreenLyrics } from "@/components/fullscreen-lyrics";
import { PlayerProvider, usePlayer } from "@/components/player-context";

function ListenerLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    showLyrics,
    showFullscreenLyrics,
    isPremium,
    setCurrentTime,
    togglePlay,
    nextSong,
    prevSong,
    setShowLyrics,
    setShowFullscreenLyrics,
  } = usePlayer();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block relative">
          <Sidebar isPremium={isPremium} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background pb-24">
          {children}
        </main>

        {/* Lyrics Panel - Desktop sidebar */}
        {showLyrics && currentSong && (
          <LyricsPanel
            song={currentSong}
            currentTime={currentTime}
            onClose={() => setShowLyrics(false)}
          />
        )}
      </div>

      {/* Player Bar - Desktop */}
      <PlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onTogglePlay={togglePlay}
        onNext={nextSong}
        onPrev={prevSong}
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
          onTogglePlay={togglePlay}
          onNext={nextSong}
          onPrev={prevSong}
          onTimeChange={setCurrentTime}
        />
      )}

      {showFullscreenLyrics && currentSong && (
        <FullscreenLyrics
          song={currentSong}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onClose={() => setShowFullscreenLyrics(false)}
          onTogglePlay={togglePlay}
          onNext={nextSong}
          onPrev={prevSong}
          onTimeChange={setCurrentTime}
        />
      )}

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}

export default function ListenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <ListenerLayoutContent>{children}</ListenerLayoutContent>
    </PlayerProvider>
  );
}
