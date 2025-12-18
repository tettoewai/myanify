"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useSession } from "next-auth/react";
import type { Song } from "@/lib/types";
import { useSongs, usePlayHistory } from "@/lib/swr";

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
  audioRef: RefObject<HTMLAudioElement | null>;
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
  getRecentlyPlayed: () => Song[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const LAST_PLAYED_SONG_KEY = "myanify_last_played_song";
const LAST_PLAYBACK_POSITION_KEY = "myanify_last_playback_position";
const MAX_RECENTLY_PLAYED = 50;
const POSITION_SAVE_INTERVAL = 5000; // Save position every 5 seconds

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
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
  const restorePositionRef = useRef<number | null>(null);
  const positionSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSongRef = useRef<Song | null>(null);

  // Use SWR to fetch songs
  const { songs } = useSongs({ isPublished: true });

  // Fetch play history from database (only if user is logged in)
  const { songs: recentlyPlayedSongs, mutate: mutatePlayHistory } =
    usePlayHistory({
      limit: MAX_RECENTLY_PLAYED,
      enabled: !!session?.user?.id,
    });

  // Initialize queue and restore last played song when songs are loaded
  useEffect(() => {
    if (songs.length > 0 && queue.length === 0) {
      setQueue(songs);

      // Only restore last played song if no current song is set
      if (!currentSong && typeof window !== "undefined") {
        try {
          const lastPlayedData = localStorage.getItem(LAST_PLAYED_SONG_KEY);
          const lastPositionData = localStorage.getItem(
            LAST_PLAYBACK_POSITION_KEY
          );

          if (lastPlayedData) {
            const lastPlayed = JSON.parse(lastPlayedData);
            const foundSong = songs.find((s) => s.id === lastPlayed.id);

            if (foundSong) {
              // Restore playback position if available
              if (lastPositionData) {
                try {
                  const savedPosition = JSON.parse(lastPositionData);
                  // Only restore if it's for the same song and position is valid
                  if (
                    savedPosition.songId === foundSong.id &&
                    typeof savedPosition.timestamp === "number" &&
                    savedPosition.timestamp >= 0 &&
                    savedPosition.timestamp < foundSong.duration
                  ) {
                    restorePositionRef.current = savedPosition.timestamp;
                  }
                } catch (error) {
                  console.error(
                    "Error parsing saved playback position:",
                    error
                  );
                }
              }

              setCurrentSong(foundSong);
              return;
            }
          }
        } catch (error) {
          console.error("Error restoring last played song:", error);
        }

        // Fallback to first song if no last played song found
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

      // Handle time updates - keep for UI components that don't need high precision
      const handleTimeUpdate = () => {
        if (audioRef.current) {
          setCurrentTime(Math.floor(audioRef.current.currentTime));
        }
      };

      // Handle ended event
      const handleEnded = () => {
        // Clear saved position when song ends
        if (currentSongRef.current) {
          savePlaybackPosition(currentSongRef.current.id, 0);
        }
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

      // Save position before page unload
      const handleBeforeUnload = () => {
        if (audioRef.current && currentSongRef.current) {
          const currentPosition = audioRef.current.currentTime;
          savePlaybackPosition(currentSongRef.current.id, currentPosition);
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        audio.pause();
        audio.src = "";
      };
    }
  }, []);

  // Update playing ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Update current song ref
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

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

      // Reset current time initially (will be restored if needed)
      if (restorePositionRef.current === null) {
        setCurrentTime(0);
      }

      const handleLoadedMetadata = () => {
        // Restore position after metadata is loaded (when duration is available)
        if (audioRef.current && restorePositionRef.current !== null) {
          const position = restorePositionRef.current;
          const duration = audioRef.current.duration || currentSong.duration;

          // Validate position is within bounds
          if (position >= 0 && position < duration) {
            audioRef.current.currentTime = position;
            setCurrentTime(position);
          } else {
            // Invalid position, reset to 0
            setCurrentTime(0);
          }
          restorePositionRef.current = null; // Clear after use
        }
      };

      const handleCanPlay = () => {
        // Ensure position is restored if metadata wasn't loaded yet
        if (audioRef.current && restorePositionRef.current !== null) {
          const position = restorePositionRef.current;
          const duration = audioRef.current.duration || currentSong.duration;

          if (position >= 0 && position < duration) {
            audioRef.current.currentTime = position;
            setCurrentTime(position);
          }
          restorePositionRef.current = null; // Clear after use
        }

        if (audioRef.current && isPlayingRef.current) {
          audioRef.current.play().catch((error) => {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
          });
        }
        audioRef.current?.removeEventListener("canplay", handleCanPlay);
      };

      audioRef.current.addEventListener("canplay", handleCanPlay);
      audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        audioRef.current?.removeEventListener("canplay", handleCanPlay);
        audioRef.current?.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );
      };
    }
  }, [currentSong?.id, currentSong?.audioUrl, currentSong?.duration]);

  // Handle time changes (seeking) - only update if difference is significant to avoid loops
  const seekingRef = useRef(false);
  useEffect(() => {
    if (audioRef.current && seekingRef.current === false) {
      const timeDiff = Math.abs(audioRef.current.currentTime - currentTime);
      if (timeDiff > 1) {
        seekingRef.current = true;
        audioRef.current.currentTime = currentTime;
        // Save position when user seeks
        if (currentSong) {
          savePlaybackPosition(currentSong.id, currentTime);
        }
        setTimeout(() => {
          seekingRef.current = false;
        }, 100);
      }
    }
  }, [currentTime, currentSong]);

  // Save playback position periodically during playback
  useEffect(() => {
    if (isPlaying && currentSong) {
      // Clear any existing interval
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
      }

      // Save position periodically
      positionSaveIntervalRef.current = setInterval(() => {
        if (audioRef.current && currentSong) {
          const currentPosition = audioRef.current.currentTime;
          savePlaybackPosition(currentSong.id, currentPosition);
        }
      }, POSITION_SAVE_INTERVAL);

      return () => {
        if (positionSaveIntervalRef.current) {
          clearInterval(positionSaveIntervalRef.current);
        }
      };
    } else {
      // Save position when paused
      if (currentSong && audioRef.current) {
        const currentPosition = audioRef.current.currentTime;
        savePlaybackPosition(currentSong.id, currentPosition);
      }

      // Clear interval when not playing
      if (positionSaveIntervalRef.current) {
        clearInterval(positionSaveIntervalRef.current);
        positionSaveIntervalRef.current = null;
      }
    }
  }, [isPlaying, currentSong]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Save to recently played in database
  const saveToRecentlyPlayed = async (song: Song) => {
    // Only save if user is logged in
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/play-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
          duration: currentTime, // Save current playback position
        }),
      });

      if (response.ok) {
        // Refresh play history
        mutatePlayHistory();
      } else {
        console.error("Error saving to play history:", await response.text());
      }
    } catch (error) {
      console.error("Error saving to recently played:", error);
    }
  };

  // Save last played song
  const saveLastPlayedSong = (song: Song) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(LAST_PLAYED_SONG_KEY, JSON.stringify(song));
    } catch (error) {
      console.error("Error saving last played song:", error);
    }
  };

  // Save playback position
  const savePlaybackPosition = (songId: string, timestamp: number) => {
    if (typeof window === "undefined") return;

    try {
      const positionData = {
        songId,
        timestamp,
        savedAt: Date.now(),
      };
      localStorage.setItem(
        LAST_PLAYBACK_POSITION_KEY,
        JSON.stringify(positionData)
      );
    } catch (error) {
      console.error("Error saving playback position:", error);
    }
  };

  const playSong = (song: Song) => {
    if (song.isPremium && !isPremium) {
      // Redirect to premium page
      window.location.href = "/premium";
      return;
    }

    // If switching to a different song, reset position (unless restoring)
    if (currentSong?.id !== song.id) {
      restorePositionRef.current = null; // Clear any restore position for new song
      setCurrentTime(0);
    }

    setCurrentSong(song);
    setIsPlaying(true);

    // Save to recently played and last played
    saveToRecentlyPlayed(song);
    saveLastPlayedSong(song);
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

  // Get recently played songs from database
  const getRecentlyPlayed = (): Song[] => {
    // Return songs from database if user is logged in, otherwise return empty array
    return session?.user?.id ? recentlyPlayedSongs : [];
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
        audioRef,
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
        getRecentlyPlayed,
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
