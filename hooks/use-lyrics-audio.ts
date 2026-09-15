"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Audio player for the lyrics editor.
 * Supports remote URL (uploaded audioUrl) + local File preview (before upload).
 */
export function useLyricsAudio(opts?: {
  initialUrl?: string;
  initialDuration?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [src, setSrc] = useState<string | null>(opts?.initialUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLocalFile, setIsLocalFile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(opts?.initialDuration ?? 0);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.src = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const setUrl = useCallback((url: string | null, dur?: number) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsLocalFile(false);
    setFileName(null);
    setSrc(url);
    setCurrentTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url ?? "";
      if (url) audioRef.current.load();
    }
    if (typeof dur === "number") setDuration(dur);
    else if (!url) setDuration(0);
  }, []);

  const loadFile = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setIsLocalFile(true);
    setFileName(file.name);
    setSrc(url);
    setCurrentTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.load();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [src]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const max = Number.isFinite(duration) && duration > 0 ? duration : undefined;
      const clamped = Math.max(
        0,
        max !== undefined ? Math.min(time, max) : time
      );
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const seekRelative = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      seek(audio.currentTime + delta);
    },
    [seek]
  );

  // Sync when initialUrl changes (e.g. song loads / new upload completes)
  useEffect(() => {
    if (opts?.initialUrl && !isLocalFile && opts.initialUrl !== src) {
      setUrl(opts.initialUrl, opts.initialDuration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts?.initialUrl]);

  return {
    src,
    fileName,
    isLocalFile,
    isPlaying,
    currentTime,
    duration,
    hasAudio: !!src,
    setUrl,
    loadFile,
    togglePlay,
    seek,
    seekRelative,
  };
}
