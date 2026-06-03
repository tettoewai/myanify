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
import useSWR from "swr";
import { useSession } from "next-auth/react";
import type { Song } from "@/lib/types";
import { requireLoginRedirect } from "@/lib/require-login";
import { useMediaSession } from "@/hooks/use-media-session";
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
  isShuffled: boolean;
  repeatMode: "off" | "all" | "one";
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
  setIsShuffled: (shuffled: boolean) => void;
  setRepeatMode: (mode: "off" | "all" | "one") => void;
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
  const { data: session, status: sessionStatus } = useSession();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showFullscreenLyrics, setShowFullscreenLyrics] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextSongRef = useRef<() => void>(() => { });
  const isPlayingRef = useRef(false);
  const restorePositionRef = useRef<number | null>(null);
  const positionSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSongRef = useRef<Song | null>(null);
  const isChangingSongRef = useRef(false);

  // Use SWR to fetch songs
  const { songs } = useSongs({ isPublished: true });

  // Fetch play history from database (only if user is logged in)
  const { songs: recentlyPlayedSongs, mutate: mutatePlayHistory } =
    usePlayHistory({
      limit: MAX_RECENTLY_PLAYED,
      enabled: !!session?.user?.id,
    });

  const { data: profile } = useSWR(
    session?.user ? "/api/user/profile" : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    if (profile && typeof profile.isPremium === "boolean") {
      setIsPremium(profile.isPremium);
    } else {
      setIsPremium(false);
    }
  }, [profile]);

  // Initialize queue and restore last played song when songs are loaded
  useEffect(() => {
    if (songs.length > 0 && queue.length === 0) {
      setQueue(songs);

      // Only restore last played song for signed-in users
      if (
        !currentSong &&
        session?.user?.id &&
        typeof window !== "undefined"
      ) {
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
  }, [songs, queue.length, currentSong, session?.user?.id]);

  const handleNextSong = () => {
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
        // Skip play() if a song src change is in progress — the canplay handler will start playback
        if (isChangingSongRef.current) return;
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
    if (audioRef.current && (currentSong?.playbackUrl || currentSong?.audioUrl)) {
      audioRef.current.pause();
      audioRef.current.src = currentSong.playbackUrl || currentSong.audioUrl;
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

        // Song src is ready — allow the isPlaying effect to call play() again
        isChangingSongRef.current = false;

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
        isChangingSongRef.current = false;
      };
    }
  }, [currentSong?.id, currentSong?.playbackUrl, currentSong?.audioUrl, currentSong?.duration]);

  // Handle time changes (seeking) — only when the user moves the slider, not during
  // normal playback (floored currentTime is always slightly behind audio.currentTime).
  const seekingRef = useRef(false);
  useEffect(() => {
    if (!audioRef.current || seekingRef.current) return;

    const audioTime = audioRef.current.currentTime;
    const timeDiff = audioTime - currentTime;
    const absDiff = Math.abs(timeDiff);

    const isUserSeek =
      absDiff >= 1 || currentTime < audioTime - 0.5;

    if (isUserSeek) {
      seekingRef.current = true;
      audioRef.current.currentTime = currentTime;
      if (currentSong) {
        savePlaybackPosition(currentSong.id, currentTime);
      }
      setTimeout(() => {
        seekingRef.current = false;
      }, 100);
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

    // Validate song ID exists
    if (!song?.id) {
      return;
    }

    // Only save if song exists in the loaded songs (to avoid saving non-existent songs)
    const songExists = songs.some((s) => s.id === song.id);
    if (!songExists) {
      return;
    }

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
        const errorText = await response.text();
        // Only log errors that aren't "Song not found" (expected for deleted/missing songs)
        if (!errorText.includes("Song not found")) {
          console.error("Error saving to play history:", errorText);
        }
      }
    } catch (error) {
      // Only log network/connection errors, not expected API errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("Network error saving to recently played:", error);
      }
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

  const requireAuthForUserAction = () => {
    if (sessionStatus === "loading") return false;
    if (!session?.user?.id) {
      requireLoginRedirect();
      return false;
    }
    return true;
  };

  const playSong = (song: Song) => {
    if (!requireAuthForUserAction()) return;

    if (song.isPremium && !isPremium) {
      // Redirect to premium page
      window.location.href = "/premium";
      return;
    }

    // If switching to a different song, reset position (unless restoring)
    if (currentSong?.id !== song.id) {
      restorePositionRef.current = null; // Clear any restore position for new song
      setCurrentTime(0);
      // Set flag synchronously before state updates so the isPlaying effect
      // (which runs before the currentSong effect) skips play() — the canplay
      // handler will start playback once the new src is ready
      isChangingSongRef.current = true;
    }

    setCurrentSong(song);
    setIsPlaying(true);

    // Save to recently played and last played
    saveToRecentlyPlayed(song);
    saveLastPlayedSong(song);
  };

  const togglePlay = () => {
    if (!requireAuthForUserAction()) return;
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    if (!currentSong) return;

    if (repeatMode === "one") {
      // If repeat one, replay the current song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (isShuffled) {
      // If shuffled, pick a random song from the queue
      const randomIndex = Math.floor(Math.random() * queue.length);
      const randomSong = queue[randomIndex];
      playSong(randomSong);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);

    // Check if we are at the end of the queue
    if (currentIndex === queue.length - 1 && repeatMode === "off") {
      // If repeat is off and we are at the end, stop playing
      setIsPlaying(false);
      return;
    }

    const nextSong = queue[(currentIndex + 1) % queue.length];
    playSong(nextSong);
  };

  const prevSong = () => {
    if (!currentSong) return;

    // If more than 3 seconds in, restart the song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (isShuffled) {
      // If shuffled, pick a random song from the queue
      const randomIndex = Math.floor(Math.random() * queue.length);
      const randomSong = queue[randomIndex];
      playSong(randomSong);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const prevSong = queue[(currentIndex - 1 + queue.length) % queue.length];
    playSong(prevSong);
  };

  // Update nextSongRef so it can be called from effects
  useEffect(() => {
    nextSongRef.current = nextSong;
  }, [nextSong]);

  const upgradePremium = () => { };

  // Get recently played songs from database
  const getRecentlyPlayed = (): Song[] => {
    // Return songs from database if user is logged in, otherwise return empty array
    return session?.user?.id ? recentlyPlayedSongs : [];
  };

  useMediaSession({
    song: currentSong,
    isPlaying,
    currentTime,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onNext: nextSong,
    onPrev: prevSong,
    onSeek: (time) => setCurrentTime(time),
  });

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
        isShuffled,
        repeatMode,
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
        setIsShuffled,
        setRepeatMode,
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
