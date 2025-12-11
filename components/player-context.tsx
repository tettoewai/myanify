"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import type { Song } from "@/lib/types";
import { useSongs } from "@/lib/swr";

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  queue: Song[];
  isPremium: boolean;
  showLyrics: boolean;
  showFullscreenLyrics: boolean;
  volume: number;
  isMuted: boolean;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setQueue: (songs: Song[]) => void;
  setIsPremium: (premium: boolean) => void;
  setShowLyrics: (show: boolean) => void;
  setShowFullscreenLyrics: (show: boolean) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  upgradePremium: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextSongRef = useRef<() => void>(() => {});
  const isPlayingRef = useRef(false);

  // Use SWR to fetch songs
  const { songs } = useSongs({ isPublished: true });

  // Initialize queue when songs are loaded
  useEffect(() => {
    if (songs.length > 0 && queue.length === 0) {
      setQueue(songs);
      if (!currentSong) {
        setCurrentSong(songs[0]);
      }
    }
  }, [songs, queue.length, currentSong]);

  const nextSong = () => {
    if (!currentSong) return;
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const nextSong = queue[(currentIndex + 1) % queue.length];
    playSong(nextSong);
  };

  // Update nextSong ref
  useEffect(() => {
    nextSongRef.current = nextSong;
  }, [currentSong, queue]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";

      // Handle time updates
      const handleTimeUpdate = () => {
        if (audioRef.current) {
          setCurrentTime(Math.floor(audioRef.current.currentTime));
        }
      };

      // Handle ended event
      const handleEnded = () => {
        nextSongRef.current();
      };

      // Handle loaded metadata
      const handleLoadedMetadata = () => {
        if (audioRef.current && currentSong) {
          // Update duration if needed
        }
      };

      const audio = audioRef.current;
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.pause();
        audio.src = "";
      };
    }
  }, []);

  // Update playing ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Handle play/pause based on isPlaying state
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle song changes
  useEffect(() => {
    if (audioRef.current && currentSong?.audioUrl) {
      // Pause current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current.src = currentSong.audioUrl;
      audioRef.current.load();
      setCurrentTime(0);

      const handleCanPlay = () => {
        if (audioRef.current && isPlayingRef.current) {
          audioRef.current.play().catch((error) => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
          });
        }
        audioRef.current?.removeEventListener("canplay", handleCanPlay);
      };

      audioRef.current.addEventListener("canplay", handleCanPlay);

      return () => {
        audioRef.current?.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [currentSong?.id, currentSong?.audioUrl]);

  // Handle time changes (seeking) - only update if difference is significant to avoid loops
  const seekingRef = useRef(false);
  useEffect(() => {
    if (audioRef.current && seekingRef.current === false) {
      const timeDiff = Math.abs(audioRef.current.currentTime - currentTime);
      if (timeDiff > 1) {
        seekingRef.current = true;
        audioRef.current.currentTime = currentTime;
        setTimeout(() => {
          seekingRef.current = false;
        }, 100);
      }
    }
  }, [currentTime]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const playSong = (song: Song) => {
    if (song.isPremium && !isPremium) {
      // Redirect to premium page
      window.location.href = "/premium";
      return;
    }
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const prevSong = () => {
    if (!currentSong) return;
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const prevSong = queue[(currentIndex - 1 + queue.length) % queue.length];
    playSong(prevSong);
  };

  const upgradePremium = () => {
    setIsPremium(true);
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        queue,
        isPremium,
        showLyrics,
        showFullscreenLyrics,
        volume,
        isMuted,
        setCurrentSong,
        setIsPlaying,
        setCurrentTime,
        setQueue,
        setIsPremium,
        setShowLyrics,
        setShowFullscreenLyrics,
        setVolume,
        setIsMuted,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        upgradePremium,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
