// API client for fetching data from the database
import type { Song, Artist, Playlist, Genre, Ad } from "./types";
import {
  transformSong,
  transformArtist,
  transformGenre,
  transformPlaylist,
  transformAd,
} from "./data-transform";

const API_BASE = "/api";

export async function getSongs(filters?: {
  genreId?: string;
  artistId?: string;
  isPublished?: boolean;
}): Promise<Song[]> {
  const params = new URLSearchParams();
  if (filters?.genreId) params.set("genreId", filters.genreId);
  if (filters?.artistId) params.set("artistId", filters.artistId);
  if (filters?.isPublished !== undefined)
    params.set("isPublished", String(filters.isPublished));

  const response = await fetch(`${API_BASE}/songs?${params}`);
  if (!response.ok) throw new Error("Failed to fetch songs");
  const result = await response.json();
  const data = result.data || result; // Support both paginated and non-paginated responses
  return Array.isArray(data) ? data.map(transformSong) : [];
}

export async function getSong(id: string): Promise<Song> {
  const response = await fetch(`${API_BASE}/songs/${id}`);
  if (!response.ok) throw new Error("Failed to fetch song");
  const data = await response.json();
  return transformSong(data);
}

export async function getArtists(): Promise<Artist[]> {
  const response = await fetch(`${API_BASE}/artists`);
  if (!response.ok) throw new Error("Failed to fetch artists");
  const result = await response.json();
  const data = result.data || result; // Support both paginated and non-paginated responses
  return Array.isArray(data) ? data.map(transformArtist) : [];
}

export async function getArtist(id: string): Promise<Artist & { songs: Song[] }> {
  const response = await fetch(`${API_BASE}/artists/${id}`);
  if (!response.ok) throw new Error("Failed to fetch artist");
  const data = await response.json();
  return {
    ...transformArtist(data),
    songs: (data.songs || []).map(transformSong),
  };
}

export async function getGenres(): Promise<Genre[]> {
  const response = await fetch(`${API_BASE}/genres`);
  if (!response.ok) throw new Error("Failed to fetch genres");
  const result = await response.json();
  const data = result.data || result; // Support both paginated and non-paginated responses
  return Array.isArray(data) ? data.map(transformGenre) : [];
}

export async function getGenre(id: string): Promise<Genre & { songs: Song[] }> {
  const response = await fetch(`${API_BASE}/genres/${id}`);
  if (!response.ok) throw new Error("Failed to fetch genre");
  const data = await response.json();
  return {
    ...transformGenre(data),
    songs: data.songs.map(transformSong),
  };
}

export async function getPlaylists(filters?: {
  userId?: string;
  isPublic?: boolean;
}): Promise<Playlist[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.isPublic !== undefined)
    params.set("isPublic", String(filters.isPublic));

  const response = await fetch(`${API_BASE}/playlists?${params}`);
  if (!response.ok) throw new Error("Failed to fetch playlists");
  const result = await response.json();
  const data = result.data || result; // Support both paginated and non-paginated responses
  return Array.isArray(data) ? data.map(transformPlaylist) : [];
}

export async function getPlaylist(id: string): Promise<Playlist> {
  const response = await fetch(`${API_BASE}/playlists/${id}`);
  if (!response.ok) throw new Error("Failed to fetch playlist");
  const data = await response.json();
  return transformPlaylist(data);
}

export async function getAds(): Promise<Ad[]> {
  const response = await fetch(`${API_BASE}/ads`);
  if (!response.ok) throw new Error("Failed to fetch ads");
  const result = await response.json();
  const data = result.data || result; // Support both paginated and non-paginated responses
  return Array.isArray(data) ? data.map(transformAd) : [];
}
