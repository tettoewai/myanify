import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Song } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the cover image URL for a song, with fallback priority:
 * 1. Album cover (if available)
 * 2. Song cover
 * 3. Placeholder
 */
export function getSongCoverUrl(song: Song): string {
  return song.albumCoverUrl || song.coverUrl || "/placeholder.svg"
}
