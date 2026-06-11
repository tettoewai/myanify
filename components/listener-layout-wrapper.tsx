"use client";

import { FullscreenLyrics } from "@/components/fullscreen-lyrics";
import { LoginPromptProvider } from "@/components/login-prompt-provider";
import { LyricsPanel } from "@/components/lyrics-panel";
import { MobileNav } from "@/components/mobile-nav";
import { MobileNowPlaying } from "@/components/mobile-now-playing";
import { PlayerBar } from "@/components/player-bar";
import { PlayerProvider, usePlayer } from "@/components/player-context";
import { Sidebar } from "@/components/sidebar";
import { UpNextDrawer } from "@/components/up-next-drawer";
import { useHomePlayerUrl } from "@/hooks/use-home-player-url";
import { Suspense, useEffect, useRef } from "react";

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
    showNowPlaying,
    setShowNowPlaying,
    isPremium,
  } = usePlayer();
  const { isHome, setPlayerInUrl } = useHomePlayerUrl();
  const hasPushedHistoryState = useRef(false);

  useEffect(() => {
    if (isHome || !showNowPlaying) return;
    setShowNowPlaying(false);
  }, [isHome, showNowPlaying, setShowNowPlaying]);

  // Handle back button when fullscreen lyrics is open (non-home routes)
  useEffect(() => {
    const handlePopState = () => {
      if (isHome) return;

      if (showFullscreenLyrics) {
        setShowFullscreenLyrics(false);
        hasPushedHistoryState.current = false;
        window.history.pushState(
          { lyricsFullscreen: false },
          "",
          window.location.href,
        );
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showFullscreenLyrics, setShowFullscreenLyrics, isHome]);

  // Push history state when opening fullscreen lyrics (non-home routes)
  useEffect(() => {
    if (isHome) return;

    if (showFullscreenLyrics && !hasPushedHistoryState.current) {
      hasPushedHistoryState.current = true;
      window.history.pushState(
        { lyricsFullscreen: true },
        "",
        window.location.href,
      );
    }
  }, [showFullscreenLyrics, isHome]);

  const handleOpenFullscreenLyrics = () => {
    setShowFullscreenLyrics(true);
    if (isHome) {
      setPlayerInUrl(true);
    }
  };

  const handleCloseFullscreenLyrics = () => {
    setShowFullscreenLyrics(false);
    if (isHome) {
      setPlayerInUrl(false);
    }
  };

  const showPlayer = !!currentSong;

  return (
    <div className="h-screen flex bg-background overflow-hidden [--desktop-player-bar-height:6rem]">
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
        </>
      )}
      {currentSong && showLyrics && (
        <LyricsPanel
          key={`lyrics-panel-${currentSong.id}`}
          song={currentSong}
          currentTime={currentTime}
          onClose={() => setShowLyrics(false)}
          className={showLyrics && !showFullscreenLyrics ? undefined : "hidden"}
        />
      )}
      <UpNextDrawer />
      {showFullscreenLyrics && currentSong && (
        <FullscreenLyrics
          key={`fullscreen-lyrics-${currentSong.id}`}
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
    <LoginPromptProvider>
      <PlayerProvider>
        <Suspense fallback={null}>
          <ListenerLayoutContent>{children}</ListenerLayoutContent>
        </Suspense>
      </PlayerProvider>
    </LoginPromptProvider>
  );
}
