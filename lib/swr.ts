import useSWR from "swr";
import type { Song, Artist, Genre, Playlist } from "./types";
import {
  transformSong,
  transformArtist,
  transformGenre,
  transformPlaylist,
} from "./data-transform";

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
};

// Custom hooks for data fetching
export function useSongs(options?: {
  genreId?: string;
  artistId?: string;
  isPublished?: boolean;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (options?.genreId) params.set("genreId", options.genreId);
  if (options?.artistId) params.set("artistId", options.artistId);
  if (options?.isPublished !== undefined)
    params.set("isPublished", String(options.isPublished));
  if (options?.search) params.set("search", options.search);

  const key = params.toString()
    ? `/api/songs?${params.toString()}`
    : "/api/songs";

  const { data, error, isLoading, mutate } = useSWR(
    options ? key : null, // Don't fetch if options is undefined
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const songs: Song[] =
    data?.data?.map(transformSong) || data?.map(transformSong) || [];

  return {
    songs,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useArtists(options?: { search?: string }) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);

  const key = params.toString()
    ? `/api/artists?${params.toString()}`
    : "/api/artists";

  const { data, error, isLoading, mutate } = useSWR(
    options ? key : null, // Don't fetch if options is undefined
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const artists: Artist[] =
    data?.data?.map(transformArtist) || data?.map(transformArtist) || [];

  return {
    artists,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useGenres() {
  const { data, error, isLoading, mutate } = useSWR("/api/genres", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const genres: Genre[] =
    data?.data?.map(transformGenre) || data?.map(transformGenre) || [];

  return {
    genres,
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePlaylists(options?: {
  userId?: string;
  isPublic?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.userId) params.set("userId", options.userId);
  if (options?.isPublic !== undefined)
    params.set("isPublic", String(options.isPublic));

  const key = params.toString()
    ? `/api/playlists?${params.toString()}`
    : "/api/playlists";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const playlists: Playlist[] =
    data?.data?.map(transformPlaylist) || data?.map(transformPlaylist) || [];

  return {
    playlists,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching a single song
export function useSong(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/songs/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    song: data ? transformSong(data) : null,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching a single artist with songs
export function useArtist(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/artists/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const artist = data
    ? {
        ...transformArtist(data),
        songs: (data.songs || []).map(transformSong),
      }
    : null;

  return {
    artist,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching a single genre with songs
export function useGenre(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/genres/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const genre = data
    ? {
        ...transformGenre(data),
        songs: (data.songs || []).map(transformSong),
      }
    : null;

  return {
    genre,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching a single playlist
export function usePlaylist(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/playlists/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    playlist: data ? transformPlaylist(data) : null,
    isLoading,
    isError: error,
    mutate,
  };
}
