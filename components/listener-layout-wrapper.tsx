"use client";

import { useState } from "react";
import { PlayerProvider, usePlayer } from "@/components/player-context";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { PlayerBar } from "@/components/player-bar";
import { MobileNowPlaying } from "@/components/mobile-now-playing";
import { MobilePlayer } from "@/components/mobile-player";
import { LyricsPanel } from "@/components/lyrics-panel";
import { FullscreenLyrics } from "@/components/fullscreen-lyrics";

function ListenerLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    togglePlay,
    nextSong,
    prevSong,
    setCurrentTime,
    showLyrics,
    setShowLyrics,
    showFullscreenLyrics,
    setShowFullscreenLyrics,
    isPremium,
  } = usePlayer();
  const [showMobilePlayer, setShowMobilePlayer] = useState(false);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar isPremium={isPremium} />
      <main className="flex-1 overflow-y-auto w-full md:w-auto pb-32 md:pb-0">
        {children}
      </main>
      <MobileNav />
      {currentSong && (
        <>
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
          <MobileNowPlaying
            song={currentSong}
            isPlaying={isPlaying}
            currentTime={currentTime}
            onTogglePlay={togglePlay}
            onNext={nextSong}
            onPrev={prevSong}
            onTimeChange={setCurrentTime}
          />
          {showMobilePlayer && (
            <MobilePlayer
              currentSong={currentSong}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onTogglePlay={togglePlay}
              onNext={nextSong}
              onPrev={prevSong}
              onTimeChange={setCurrentTime}
              onClose={() => setShowMobilePlayer(false)}
            />
          )}
        </>
      )}
      {showLyrics && currentSong && (
        <LyricsPanel
          song={currentSong}
          currentTime={currentTime}
          onClose={() => setShowLyrics(false)}
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
    </div>
  );
}

export function ListenerLayoutWrapper({
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
