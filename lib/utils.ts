import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PLACEHOLDER, getPlaceholderSrc } from "./placeholders"
import type { Song } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derive a 1–2 character avatar fallback from a user's full name,
 * falling back to the email prefix when no name is set.
 * e.g. "Aung Min" → "AM", "Zaw" → "ZA", no name → first 2 chars of email.
 */
export function getInitials(
  name?: string | null,
  email?: string | null
): string {
  const clean = (name ?? "").trim()
  if (clean) {
    const parts = clean.split(/\s+/)
    if (parts.length >= 2 && parts[0][0] && parts[parts.length - 1][0]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  const prefix = (email ?? "").split("@")[0].replace(/[^a-zA-Z0-9]/g, "")
  if (prefix) {
    return prefix.slice(0, 2).toUpperCase()
  }
  return "U"
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
