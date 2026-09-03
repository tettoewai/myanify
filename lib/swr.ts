import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  RateLimitError,
  notifyRateLimitError,
  parseApiErrorBody,
  swrFetcher,
} from "./api-client";
import type { Song, Artist, Genre, Playlist, LyricLine } from "./types";
import type { PaginationMeta } from "./pagination";
import {
  transformSong,
  transformArtist,
  transformGenre,
  transformPlaylist,
} from "./data-transform";

const fetcher = swrFetcher;

// Catalog data fetching (listener view - always transformed, lazy revalidation)
export function useSongs(options?: {
  genreId?: string;
  artistId?: string;
  albumId?: string;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const enabled = options?.enabled !== false;
  const params = new URLSearchParams();
  if (options?.genreId) params.set("genreId", options.genreId);
  if (options?.artistId) params.set("artistId", options.artistId);
  if (options?.albumId) params.set("albumId", options.albumId);
  if (options?.isPublished !== undefined)
    params.set("isPublished", String(options.isPublished));
  if (options?.search) params.set("search", options.search);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));

  const key = enabled
    ? params.toString()
      ? `/api/songs?${params.toString()}`
      : "/api/songs"
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000, // Catalog data: avoid duplicate requests for 60s
    },
  );

  const pagination: PaginationMeta | undefined = data?.pagination;
  const songs: Song[] =
    data?.data?.map(transformSong) || data?.map(transformSong) || [];

  return {
    songs,
    pagination,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

// Admin data fetching (raw/untransformed data for admin tooling)
export function useAdminSongs(options?: {
  genreId?: string;
  artistId?: string;
  albumId?: string;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}) {
  const enabled = options?.enabled !== false;
  const params = new URLSearchParams();
  if (options?.genreId) params.set("genreId", options.genreId);
  if (options?.artistId) params.set("artistId", options.artistId);
  if (options?.albumId) params.set("albumId", options.albumId);
  if (options?.isPublished !== undefined)
    params.set("isPublished", String(options.isPublished));
  if (options?.search) params.set("search", options.search);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));

  const key = enabled
    ? params.toString()
      ? `/api/songs?${params.toString()}`
      : "/api/songs"
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus: true, // Admin: keep fresh
      revalidateOnReconnect: true,
      dedupingInterval: 10_000,
    },
  );

  const pagination: PaginationMeta | undefined = data?.pagination;
  const songs = data?.data || data || [];

  return {
    songs: Array.isArray(songs) ? songs : [],
    pagination,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

export function useQuickPlaySongs(limit = 4) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const { data, error, isLoading, mutate } = useSWR(
    `/api/songs/quick-play?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  const songs: Song[] = data?.data?.map(transformSong) || [];

  return {
    songs,
    featuredSong: songs[0] ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useArtists(options?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));

  const key = params.toString()
    ? `/api/artists?${params.toString()}`
    : "/api/artists";

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
    },
  );

  const artists: Artist[] =
    data?.data?.map(transformArtist) || data?.map(transformArtist) || [];

  return {
    artists,
    pagination: data?.pagination as PaginationMeta | undefined,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

export function useSearch(
  query?: string,
  options?: {
    perPage?: number;
  },
) {
  const trimmedQuery = query?.trim();
  const limit = options?.perPage ?? 20;
  const key = trimmedQuery ? `search:${trimmedQuery}:${limit}` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    async () => {
      const params = new URLSearchParams({
        search: trimmedQuery!,
        limit: String(limit),
      });

      const [songsRes, artistsRes] = await Promise.all([
        fetcher(`/api/songs?${params}&isPublished=true`),
        fetcher(`/api/artists?${params}`),
      ]);

      return {
        songs: songsRes.data?.map(transformSong) ?? [],
        artists: artistsRes.data?.map(transformArtist) ?? [],
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
    },
  );

  const songs: Song[] = data?.songs ?? [];
  const artists: Artist[] = data?.artists ?? [];

  return {
    songs,
    artists,
    isLoading,
    isValidating,
    isError: error,
    mutate,
  };
}

export function useGenres(options?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.search) params.set("search", options.search);

  const key = params.toString()
    ? `/api/genres?${params.toString()}`
    : "/api/genres";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const genres: Genre[] =
    data?.data?.map(transformGenre) || data?.map(transformGenre) || [];

  return {
    genres,
    pagination: data?.pagination as PaginationMeta | undefined,
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
    },
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

export function useSimilarSongs(
  seedSongId: string | null,
  excludeIds: string[] = [],
  options?: { enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (seedSongId) params.set("seedSongId", seedSongId);
  if (excludeIds.length > 0) params.set("excludeIds", excludeIds.join(","));
  params.set("limit", "10");

  const key =
    options?.enabled !== false && seedSongId
      ? `/api/songs/similar?${params.toString()}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  const songs: Song[] =
    data?.data?.map(transformSong) || data?.map(transformSong) || [];

  return { songs, isLoading, isError: error, mutate };
}

// Hook for fetching a single song
export function useSong(
  slug: string | null,
  admin?: boolean,
  options?: { includeLyrics?: boolean },
) {
  const params = new URLSearchParams();
  if (options?.includeLyrics) params.set("include", "lyrics");
  const query = params.toString();

  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/songs/${slug}${query ? `?${query}` : ""}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
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

export async function fetchSongLyrics(
  songIdOrSlug: string,
): Promise<LyricLine[]> {
  const response = await fetch(
    `/api/songs/${encodeURIComponent(songIdOrSlug)}?include=lyrics`,
  );
  if (!response.ok) {
    if (response.status === 429) {
      const { retryAfterSeconds } = await parseApiErrorBody(response);
      notifyRateLimitError(retryAfterSeconds);
    }
    throw new Error("Failed to fetch song lyrics");
  }

  const data = await response.json();
  return transformSong(data).lyrics ?? [];
}

export function useSongWithLyrics(song: Song | null, enabled = true) {
  const [resolvedLyrics, setResolvedLyrics] = useState<LyricLine[] | undefined>(
    song?.lyrics,
  );
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  useEffect(() => {
    setResolvedLyrics(song?.lyrics);
  }, [song?.id, song?.lyrics]);

  useEffect(() => {
    if (!enabled || !song || song.lyrics !== undefined) {
      setIsLoadingLyrics(false);
      return;
    }

    let cancelled = false;
    setIsLoadingLyrics(true);

    fetchSongLyrics(song.slug)
      .then((lyrics) => {
        if (!cancelled) setResolvedLyrics(lyrics);
      })
      .catch(() => {
        if (!cancelled) setResolvedLyrics([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLyrics(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, song?.id, song?.slug, song?.lyrics]);

  if (!song) {
    return { song: null, isLoadingLyrics: false };
  }

  return {
    song: { ...song, lyrics: resolvedLyrics ?? song.lyrics },
    isLoadingLyrics,
  };
}

// Hook for fetching a single artist with songs
export function useArtist(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/artists/${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const artist = data
    ? {
        ...transformArtist(data),
        songs: (data.songs || []).map((item: any) =>
          transformSong(item.song || item),
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
export function useGenre(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/genres/${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
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
export function usePlaylist(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/playlists/${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return {
    playlist: data ? transformPlaylist(data) : null,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching albums
export function useAlbums(options?: {
  search?: string;
  page?: number;
  limit?: number;
  sort?: "name" | "recent";
}) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.sort) params.set("sort", options.sort);

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
    pagination: data?.pagination as PaginationMeta | undefined,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching a single album
export function useAlbum(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `/api/albums/${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const album = useMemo(
    () =>
      data
        ? {
            ...data,
            songs: (data.songs || []).map(transformSong),
          }
        : null,
    [data],
  );

  return {
    album,
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for fetching ads
export function useAds(options?: {
  page?: number;
  limit?: number;
  search?: string;
  /** Admin ads management only — includes inactive/expired ads */
  includeInactive?: boolean;
}) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.search) params.set("search", options.search);
  if (options?.includeInactive) params.set("includeInactive", "true");

  const key = params.toString() ? `/api/ads?${params.toString()}` : "/api/ads";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const ads = data?.data || data || [];

  return {
    ads: Array.isArray(ads) ? ads : [],
    pagination: data?.pagination as PaginationMeta | undefined,
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
    },
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
    revalidateOnFocus: true, // User data: refresh when returning to tab
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
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
    revalidateOnFocus: true, // User data: refresh when returning to tab
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
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

type LikedSongsCache = { data: Song[] } | Song[] | undefined;

function normalizeLikedSongsCache(data: LikedSongsCache): Song[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function buildLikedSongsCache(
  songs: Song[],
  previous: LikedSongsCache,
): { data: Song[] } {
  if (previous && !Array.isArray(previous) && Array.isArray(previous.data)) {
    return { data: songs };
  }
  return { data: songs };
}

function applyLikeToggleToCache(
  current: LikedSongsCache,
  song: Song,
  liked: boolean,
): { data: Song[] } {
  const songs = normalizeLikedSongsCache(current);
  const next = liked
    ? [song, ...songs.filter((s) => s.id !== song.id)]
    : songs.filter((s) => s.id !== song.id);
  return buildLikedSongsCache(next, current);
}

export function useToggleLikeSong(options?: { enabled?: boolean }) {
  const { likedSongIds, mutate } = useLikedSongs(options);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleLike = useCallback(
    async (song: Song) => {
      const songId = song.id;
      if (!songId || togglingId === songId) return;

      const wasLiked = likedSongIds.has(songId);
      setTogglingId(songId);

      try {
        await mutate(
          async (current: LikedSongsCache) => {
            const ok = wasLiked
              ? await unlikeSong(songId)
              : await likeSong(songId);
            if (!ok) {
              throw new Error("Failed to update liked songs");
            }
            return applyLikeToggleToCache(current, song, !wasLiked);
          },
          {
            optimisticData: (current: LikedSongsCache) =>
              applyLikeToggleToCache(current, song, !wasLiked),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          },
        );
      } catch (error) {
        console.error("Error toggling like:", error);
        if (error instanceof RateLimitError) {
          notifyRateLimitError(error.retryAfterSeconds);
        } else {
          toast.error(
            wasLiked
              ? "Couldn't remove from liked songs"
              : "Couldn't save song",
          );
        }
      } finally {
        setTogglingId(null);
      }
    },
    [likedSongIds, mutate, togglingId],
  );

  return {
    likedSongIds,
    isLiked: (songId: string) => likedSongIds.has(songId),
    toggleLike,
    mutateLikedSongs: mutate,
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
async function handleLikeMutationResponse(
  response: Response,
): Promise<boolean> {
  if (response.ok) {
    return true;
  }

  if (response.status === 429) {
    const { retryAfterSeconds } = await parseApiErrorBody(response);
    throw new RateLimitError("Too many requests", retryAfterSeconds);
  }

  return false;
}

export async function likeSong(songId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/liked-songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId }),
    });
    return handleLikeMutationResponse(response);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    return false;
  }
}

export async function unlikeSong(songId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/liked-songs?songId=${songId}`, {
      method: "DELETE",
    });
    return handleLikeMutationResponse(response);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
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
    return handleLikeMutationResponse(response);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    return false;
  }
}

export async function unlikeArtist(artistId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/liked-artists?artistId=${artistId}`, {
      method: "DELETE",
    });
    return handleLikeMutationResponse(response);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
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
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.role && options.role !== "all") params.set("role", options.role);
  if (options?.vip === "vip") params.set("vip", "true");
  else if (options?.vip === "non-vip") params.set("vip", "false");
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));

  const key = params.toString()
    ? `/api/admin/users?${params.toString()}`
    : "/api/admin/users";

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    users: data?.data || [],
    pagination: data?.pagination as PaginationMeta | undefined,
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
  if (options?.status && options.status !== "all")
    params.set("status", options.status);
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
  type: "click" | "impression",
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

// Hook for fetching user's song requests
export function useSongRequests() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/song-requests",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    requests: data?.data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

// Hook for admin: fetching all song requests with filters
export function useAdminSongRequests(options?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.status && options.status !== "all")
    params.set("status", options.status);
  if (options?.search) params.set("search", options.search);
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());

  const key = `/api/song-requests/admin?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    requests: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate,
  };
}
