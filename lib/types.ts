import type { AlbumType } from "./album-type"

export interface Album {
  id: string
  name: string
  coverUrl: string | null
  type: AlbumType
  description: string | null
  releaseDate: string | null
  createdAt?: string
  updatedAt?: string
  songs?: Song[]
}

export interface Song {
  id: string
  title: string
  artist: string // Comma-separated artist names for display
  artists?: string[] // Array of artist names (optional, for when full list is needed)
  album: string
  albumType?: AlbumType | null
  duration: number
  coverUrl: string
  albumCoverUrl?: string | null // Album cover URL for fallback
  audioUrl: string
  playbackUrl: string
  genre: string
  lyrics: LyricLine[]
  isPremium: boolean
}

export interface LyricLine {
  time: number
  text: string
}

export interface Artist {
  id: string
  name: string
  imageUrl: string
  bio: string
  monthlyListeners: number
  genres: string[]
}

export interface Playlist {
  id: string
  name: string
  description: string
  coverUrl: string
  songs: Song[]
  createdBy: string
  isPublic: boolean
  createdAt: Date
}

export interface Genre {
  id: string
  name: string
  imageUrl: string
  description: string
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  isPremium: boolean
  playlists: Playlist[]
  likedSongs: string[]
}

export interface Ad {
  id: string
  title: string
  description: string
  imageUrl: string
  linkUrl: string
  sponsor: string
}
