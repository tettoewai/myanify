"use client";

import { useState, useEffect, useRef } from "react";
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
  const hasPushedHistoryState = useRef(false);

  // Handle back button when fullscreen lyrics is open
  useEffect(() => {
    // Listen for popstate (back button)
    const handlePopState = (event: PopStateEvent) => {
      // If we're in fullscreen lyrics and back is pressed, close it instead of navigating
      if (showFullscreenLyrics) {
        setShowFullscreenLyrics(false);
        hasPushedHistoryState.current = false;
        // Prevent the default navigation by pushing the state back
        // This keeps the user on the current page
        window.history.pushState(
          { lyricsFullscreen: false },
          "",
          window.location.href
        );
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showFullscreenLyrics, setShowFullscreenLyrics]);

  // Push history state when opening fullscreen lyrics
  useEffect(() => {
    if (showFullscreenLyrics && !hasPushedHistoryState.current) {
      hasPushedHistoryState.current = true;
      window.history.pushState(
        { lyricsFullscreen: true },
        "",
        window.location.href
      );
    }
  }, [showFullscreenLyrics]);

  // Handle opening fullscreen lyrics with history state
  const handleOpenFullscreenLyrics = () => {
    setShowFullscreenLyrics(true);
  };

  const handleCloseFullscreenLyrics = () => {
    setShowFullscreenLyrics(false);
  };

  const showPlayer = !!currentSong;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar isPremium={isPremium} />
      <main className="flex-1 overflow-y-auto w-full md:w-auto pb-32 md:pb-0">
        {children}
      </main>
      <MobileNav />
      {showPlayer && (
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
            onOpenFullscreenLyrics={handleOpenFullscreenLyrics}
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
          onClose={handleCloseFullscreenLyrics}
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
