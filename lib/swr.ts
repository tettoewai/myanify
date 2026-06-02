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
  albumId?: string;
  isPublished?: boolean;
  search?: string;
  admin?: boolean; // If true, return raw data without transformation
}) {
  const params = new URLSearchParams();
  if (options?.genreId) params.set("genreId", options.genreId);
  if (options?.artistId) params.set("artistId", options.artistId);
  if (options?.albumId) params.set("albumId", options.albumId);
  if (options?.isPublished !== undefined)
    params.set("isPublished", String(options.isPublished));
  if (options?.search) params.set("search", options.search);

  const key = params.toString()
    ? `/api/songs?${params.toString()}`
    : "/api/songs";

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // For admin pages, return raw data without transformation
  if (options?.admin) {
    const songs = data?.data || data || [];
    return {
      songs: Array.isArray(songs) ? songs : [],
      isLoading,
      isValidating,
      isError: error,
      mutate,
    };
  }

  // For public pages, transform the data
  const songs: Song[] =
    data?.data?.map(transformSong) || data?.map(transformSong) || [];

  return {
    songs,
    isLoading,
    isValidating,
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

  const { data, error, isLoading, isValidating, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const artists: Artist[] =
    data?.data?.map(transformArtist) || data?.map(transformArtist) || [];

  return {
    artists,
    isLoading,
    isValidating,
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

export function usePlans(options?: { activeOnly?: boolean }) {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");

  const key = `/api/admin/plans?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    plans: data?.plans || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePaymentMethods(options?: { activeOnly?: boolean }) {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");

  const key = `/api/admin/payment-methods?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    paymentMethods: data?.paymentMethods || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePaymentMethod(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/admin/payment-methods/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    paymentMethod: data?.paymentMethod || null,
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePlaylists(options?: {
  userId?: string;
  isPublic?: boolean;
  enabled?: boolean;
}) {
  const enabled = options?.enabled !== false;
  const params = new URLSearchParams();
  if (options?.userId) params.set("userId", options.userId);
  if (options?.isPublic !== undefined)
    params.set("isPublic", String(options.isPublic));

  const key = enabled
    ? params.toString()
      ? `/api/playlists?${params.toString()}`
      : "/api/playlists"
    : null;

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
export function useSong(id: string | null, admin?: boolean) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/songs/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // For admin pages, return raw data without transformation
  if (admin) {
    return {
      song: data || null,
      isLoading,
      isError: error,
      mutate,
    };
  }

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
      songs: (data.songs || []).map((item: any) =>
        transformSong(item.song || item)
      ),
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

// Hook for fetching albums
export function useAlbums(options?: { search?: string }) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);

  const key = params.toString()
    ? `/api/albums?${params.toString()}`
    : "/api/albums";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const albums = data?.data || data || [];

  return {
    albums: Array.isArray(albums) ? albums : [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching a single album
export function useAlbum(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/albums/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  return {
    album: data || null,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching ads
export function useAds(options?: { limit?: number }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));

  const key = params.toString() ? `/api/ads?${params.toString()}` : "/api/ads";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const ads = data?.data || data || [];

  return {
    ads: Array.isArray(ads) ? ads : [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching admin stats
export function useAdminStats() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/admin/stats",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    stats: data || null,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching play history
export function usePlayHistory(options?: {
  limit?: number;
  enabled?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));

  const key =
    options?.enabled !== false
      ? params.toString()
        ? `/api/play-history?${params.toString()}`
        : "/api/play-history"
      : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const songs: Song[] =
    data?.data?.map(transformSong) || data?.map(transformSong) || [];

  return {
    songs,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching liked songs
export function useLikedSongs(options?: { enabled?: boolean }) {
  const key = options?.enabled !== false ? "/api/liked-songs" : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const songs: Song[] =
    data?.data?.map(transformSong) || data?.map(transformSong) || [];

  // Extract song IDs for quick lookup
  const likedSongIds: Set<string> = new Set(songs.map((s) => s.id));

  return {
    songs,
    likedSongIds,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching liked artists
export function useLikedArtists(options?: { enabled?: boolean }) {
  const key = options?.enabled !== false ? "/api/liked-artists" : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const artists: Artist[] =
    data?.data?.map(transformArtist) || data?.map(transformArtist) || [];

  // Extract artist IDs for quick lookup
  const likedArtistIds: Set<string> = new Set(artists.map((a) => a.id));

  return {
    artists,
    likedArtistIds,
    isLoading,
    isError: error,
    mutate,
  };
}

// Helper functions for liking/unliking songs
export async function likeSong(songId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/liked-songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function unlikeSong(songId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/liked-songs?songId=${songId}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Helper functions for liking/unliking artists
export async function likeArtist(artistId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/liked-artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function unlikeArtist(artistId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/liked-artists?artistId=${artistId}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Hook for fetching user profile
export function useProfile(options?: { enabled?: boolean }) {
  const key = options?.enabled !== false ? "/api/user/profile" : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    profile: data || null,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching admin users
export function useAdminUsers(options?: {
  search?: string;
  role?: string;
  vip?: string;
}) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.role && options.role !== "all") params.set("role", options.role);
  if (options?.vip === "vip") params.set("vip", "true");
  else if (options?.vip === "non-vip") params.set("vip", "false");

  const key = params.toString() ? `/api/admin/users?${params.toString()}` : "/api/admin/users";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    users: data?.data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching subscription requests
export function useSubscriptionRequests(options?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.status && options.status !== "all") params.set("status", options.status);
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());

  const key = `/api/vip/payment/admin?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    data,
    requests: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}

// Helper function for tracking ad events
export async function trackAdEvent(
  adId: string,
  type: "click" | "impression"
): Promise<boolean> {
  try {
    const response = await fetch(`/api/ads/${adId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
