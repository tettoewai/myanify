"use client";

import { FullscreenLyrics } from "@/components/fullscreen-lyrics";
import { FloatingDownloadProgress } from "@/components/floating-download-progress";
import { LoginPromptProvider } from "@/components/login-prompt-provider";
import { LyricsPanel } from "@/components/lyrics-panel";
import { MobileNav } from "@/components/mobile-nav";
import { MobileNowPlaying } from "@/components/mobile-now-playing";
import { OfflineProvider } from "@/components/offline-provider";
import { PlayerBar } from "@/components/player-bar";
import { PlayerProvider, usePlayer } from "@/components/player-context";
import { Sidebar } from "@/components/sidebar";
import { UpNextDrawer } from "@/components/up-next-drawer";
import { useHomePlayerUrl } from "@/hooks/use-home-player-url";
import { isMobileViewport } from "@/lib/utils";
import { Suspense, useEffect, useRef } from "react";
import { AppDownloadBanner } from "@/components/app-download-banner";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

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
    setOpenMobileLyricsTab,
    requestCurrentSongLyrics,
    isPremium,
  } = usePlayer();
  const { isHome, setPlayerInUrl } = useHomePlayerUrl();
  const hasPushedHistoryState = useRef(false);

  // Handle back button when fullscreen player is open (non-home routes)
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

      if (showNowPlaying) {
        setShowNowPlaying(false);
        hasPushedHistoryState.current = false;
        window.history.pushState(
          { nowPlaying: false },
          "",
          window.location.href,
        );
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    showFullscreenLyrics,
    showNowPlaying,
    setShowFullscreenLyrics,
    setShowNowPlaying,
    isHome,
  ]);

  // Push history state when opening fullscreen player (non-home routes)
  useEffect(() => {
    if (isHome) return;

    const playerOpen = showFullscreenLyrics || showNowPlaying;
    if (playerOpen && !hasPushedHistoryState.current) {
      hasPushedHistoryState.current = true;
      window.history.pushState(
        {
          lyricsFullscreen: showFullscreenLyrics,
          nowPlaying: showNowPlaying,
        },
        "",
        window.location.href,
      );
    }
  }, [showFullscreenLyrics, showNowPlaying, isHome]);

  const handleOpenFullscreenLyrics = () => {
    requestCurrentSongLyrics();
    if (isMobileViewport()) {
      setOpenMobileLyricsTab(true);
      setShowNowPlaying(true);
    } else {
      setShowFullscreenLyrics(true);
    }
    if (isHome) {
      setPlayerInUrl(true);
    }
  };

  const handleToggleLyrics = () => {
    const nextShowLyrics = !showLyrics;
    if (nextShowLyrics) {
      requestCurrentSongLyrics();
    }
    setShowLyrics(nextShowLyrics);
  };

  useEffect(() => {
    if (!showLyrics || !currentSong) return;
    requestCurrentSongLyrics();
  }, [showLyrics, currentSong?.id, requestCurrentSongLyrics]);

  const handleCloseFullscreenLyrics = () => {
    if (isMobileViewport()) {
      setShowNowPlaying(false);
    } else {
      setShowFullscreenLyrics(false);
    }
    if (isHome) {
      setPlayerInUrl(false);
    }
  };

  const showPlayer = !!currentSong;

  return (
    <div className="h-screen flex bg-background overflow-hidden [--desktop-player-bar-height:6rem]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full md:w-auto pb-32 md:pb-0">
        <div className="px-4 pt-4 md:px-6 md:pt-6 lg:px-8 space-y-3">
          <AppDownloadBanner />
          <PwaInstallBanner />
        </div>
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
            onToggleLyrics={handleToggleLyrics}
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
      <FloatingDownloadProgress />
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
        <OfflineProvider>
          <Suspense fallback={null}>
            <ListenerLayoutContent>{children}</ListenerLayoutContent>
          </Suspense>
        </OfflineProvider>
      </PlayerProvider>
    </LoginPromptProvider>
  );
}
