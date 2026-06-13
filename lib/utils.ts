import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PLACEHOLDER, getPlaceholderSrc } from "./placeholders"
import type { Song } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  )
}

export function isPlaceholderCoverUrl(url: string | null | undefined): boolean {
  if (!url) return true
  return (
    url === PLACEHOLDER.light ||
    url === PLACEHOLDER.dark ||
    url === "/placeholder.svg"
  )
}

export function resolveSongCoverUrl(options: {
  coverUrl?: string | null
  albumCoverUrl?: string | null
  artistImageUrl?: string | null
  placeholderTheme?: "light" | "dark"
}): string {
  const placeholderTheme = options.placeholderTheme ?? "dark"

  if (!isPlaceholderCoverUrl(options.albumCoverUrl)) {
    return options.albumCoverUrl!
  }
  if (!isPlaceholderCoverUrl(options.coverUrl)) {
    return options.coverUrl!
  }
  if (!isPlaceholderCoverUrl(options.artistImageUrl)) {
    return options.artistImageUrl!
  }

  return getPlaceholderSrc(placeholderTheme)
}

/**
 * Get the cover image URL for a song, with fallback priority:
 * 1. Album cover (if available)
 * 2. Song cover
 * 3. Artist image
 * 4. Placeholder
 */
export function getSongCoverUrl(
  song: Song,
  placeholderTheme: "light" | "dark" = "dark"
): string {
  return resolveSongCoverUrl({
    coverUrl: song.coverUrl,
    albumCoverUrl: song.albumCoverUrl,
    artistImageUrl: song.artistImageUrl,
    placeholderTheme,
  })
}
