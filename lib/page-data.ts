/**
 * Server-side data fetchers for entity pages.
 *
 * These fetch Prisma data in the same shape the API routes return, so the
 * result can be used as SWR fallback data. This eliminates the client-side
 * loading skeleton on first render and ensures crawlers see full content.
 */
import { cache } from "react";
import { prisma } from "@/db";
import { getPlaybackUrl } from "@/lib/playback-url";
import { flattenSongLyrics } from "@/lib/song-response";
import { buildSongInclude } from "@/lib/song-query";
import { calculateMonthlyListeners } from "@/lib/monthly-listeners";

// ─── helpers ─────────────────────────────────────────────────────────────────

function stripLyrics(song: any) {
  const { lyrics: _l, ...rest } = song;
  return rest;
}

/** Match what `formatSongResponse` + `withPlaybackUrl` produce in the API. */
function formatSongForServer(song: any, includeLyrics = false): any {
  const base = includeLyrics ? flattenSongLyrics(song) : stripLyrics(song);
  return {
    ...base,
    playbackUrl: getPlaybackUrl(song.audioUrl),
  };
}

const songInclude = buildSongInclude(false);
const songIncludeWithLyrics = buildSongInclude(true);

// ─── album ───────────────────────────────────────────────────────────────────

export const getAlbumPageData = cache(async (slug: string) => {
  try {
    const album = await prisma.album.findFirst({
      where: { slug },
      include: {
        seo: true,
        songs: {
          where: { isPublished: true },
          include: { ...songInclude, album: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!album) return null;
    return {
      ...album,
      songs: album.songs.map((s) => formatSongForServer(s)),
    };
  } catch {
    return null;
  }
});

// ─── song ─────────────────────────────────────────────────────────────────────

export const getSongPageData = cache(async (slug: string) => {
  try {
    const song = await prisma.song.findFirst({
      where: { slug, isPublished: true },
      include: {
        seo: true,
        ...songIncludeWithLyrics,
        album: true,
      },
    });
    if (!song) return null;
    return formatSongForServer(song, true);
  } catch {
    return null;
  }
});

// ─── artist ──────────────────────────────────────────────────────────────────

export const getArtistPageData = cache(async (slug: string) => {
  try {
    const artist = await prisma.artist.findFirst({
      where: { slug },
      include: {
        seo: true,
        artistGenres: { include: { genre: true } },
        songs: {
          where: { song: { isPublished: true } },
          include: {
            song: {
              include: { ...songInclude, album: true },
            },
          },
          orderBy: { song: { createdAt: "desc" } },
          take: 50,
        },
      },
    });
    if (!artist) return null;

    const monthlyListeners = await calculateMonthlyListeners(artist.id).catch(
      () => artist.monthlyListeners,
    );

    return {
      ...artist,
      monthlyListeners: Math.max(artist.monthlyListeners, monthlyListeners),
      songs: artist.songs.map((sa) => ({
        ...sa,
        song: formatSongForServer(sa.song),
      })),
    };
  } catch {
    return null;
  }
});

// ─── genre ───────────────────────────────────────────────────────────────────

export const getGenrePageData = cache(async (slug: string) => {
  try {
    const genre = await prisma.genre.findFirst({
      where: { slug },
      include: {
        seo: true,
        songs: {
          where: { isPublished: true },
          include: { ...songInclude, album: true },
        },
      },
    });
    if (!genre) return null;
    return {
      ...genre,
      songs: genre.songs.map((s) => formatSongForServer(s)),
    };
  } catch {
    return null;
  }
});

// ─── playlist ────────────────────────────────────────────────────────────────

export const getPlaylistPageData = cache(async (slug: string) => {
  try {
    const playlist = await prisma.playlist.findFirst({
      where: { slug, isPublic: true },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        songs: {
          include: {
            song: {
              include: { ...songInclude, album: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!playlist) return null;
    return {
      ...playlist,
      songs: playlist.songs.map((ps) => ({
        ...ps,
        song: formatSongForServer(ps.song),
      })),
    };
  } catch {
    return null;
  }
});
