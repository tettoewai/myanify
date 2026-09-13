// Transform Prisma data to match frontend types
import type { Song, Artist, Playlist, Genre, Ad, LyricLine } from "./types";
import { getPlaybackUrl } from "./playback-url";
import { getPlaceholderSrc } from "./placeholders";

const FALLBACK_COVER = getPlaceholderSrc("dark");

export function transformSong(prismaSong: any): Song {
  // Handle multiple artists - support both old single artist and new many-to-many
  const artists = prismaSong.artists?.map((sa: any) => sa.artist?.name).filter(Boolean) || 
                  (prismaSong.artist ? [prismaSong.artist.name] : []);
  const artistNames = artists.join(", ") || "Unknown Artist";
  
  const artistIds =
    prismaSong.artists
      ?.map((sa: { artist?: { id?: string } }) => sa.artist?.id)
      .filter((id: string | undefined): id is string => Boolean(id)) ?? [];

  const artistSlugs =
    prismaSong.artists
      ?.map((sa: { artist?: { slug?: string } }) => sa.artist?.slug)
      .filter((slug: string | undefined): slug is string => Boolean(slug)) ?? [];

  const artistImageUrl =
    prismaSong.artists
      ?.map(
        (sa: { artist?: { imageUrl?: string | null } }) => sa.artist?.imageUrl,
      )
      .find((url: string | null | undefined) => Boolean(url)) ?? null;

  return {
    id: prismaSong.id,
    slug: prismaSong.slug ?? prismaSong.id,
    title: prismaSong.title,
    artist: artistNames,
    artists: artists.filter((name: string) => name),
    artistIds,
    artistSlugs,
    albumId: prismaSong.albumId ?? prismaSong.album?.id ?? null,
    albumSlug: prismaSong.album?.slug ?? null,
    album: prismaSong.album?.name || "",
    albumType: prismaSong.album?.type ?? null,
    duration: prismaSong.duration,
    coverUrl: prismaSong.coverUrl || FALLBACK_COVER,
    albumCoverUrl: prismaSong.album?.coverUrl || null,
    artistImageUrl,
    audioUrl: prismaSong.audioUrl,
    playbackUrl: prismaSong.playbackUrl || getPlaybackUrl(prismaSong.audioUrl),
    genre: prismaSong.genre?.name || "",
    genreId: prismaSong.genreId ?? prismaSong.genre?.id ?? null,
    language: prismaSong.language ?? null,
    mood: prismaSong.mood ?? null,
    tags: Array.isArray(prismaSong.tags) ? prismaSong.tags : [],
    isPremium: prismaSong.isPremium,
    isPublished: prismaSong.isPublished,
    lyrics:
      prismaSong.lyrics === undefined || prismaSong.lyrics === null
        ? undefined
        : (Array.isArray(prismaSong.lyrics)
            ? [...prismaSong.lyrics].sort(
                (a: { time?: number }, b: { time?: number }) =>
                  (a.time ?? 0) - (b.time ?? 0),
              )
            : []
          ).map(
            (lyric: { time?: number; text?: string }): LyricLine => ({
              time: lyric.time ?? 0,
              text: lyric.text ?? "",
            }),
          ),
  };
}

export function transformArtist(prismaArtist: any): Artist {
  return {
    id: prismaArtist.id,
    slug: prismaArtist.slug ?? prismaArtist.id,
    name: prismaArtist.name,
    englishName: prismaArtist.englishName,
    imageUrl: prismaArtist.imageUrl || FALLBACK_COVER,
    bio: prismaArtist.bio || "",
    monthlyListeners: prismaArtist.monthlyListeners,
    genres: prismaArtist.artistGenres?.map((ag: any) => ag.genre.name) || [],
    songCount: prismaArtist._count?.songs ?? 0,
    fans: prismaArtist._count?.likedBy ?? 0,
    country: prismaArtist.country ?? null,
    createdAt: prismaArtist.createdAt ?? null,
  };
}

export function transformGenre(prismaGenre: any): Genre {
  return {
    id: prismaGenre.id,
    slug: prismaGenre.slug ?? prismaGenre.id,
    name: prismaGenre.name,
    imageUrl: prismaGenre.imageUrl || FALLBACK_COVER,
    description: prismaGenre.description || "",
  };
}

export function transformPlaylist(prismaPlaylist: any): Playlist {
  return {
    id: prismaPlaylist.id,
    slug: prismaPlaylist.slug ?? prismaPlaylist.id,
    name: prismaPlaylist.name,
    description: prismaPlaylist.description || "",
    coverUrl: prismaPlaylist.coverUrl || FALLBACK_COVER,
    songs: prismaPlaylist.songs?.map((ps: any) => {
      const song = ps.song || ps;
      return transformSong(song);
    }) || [],
    createdBy: prismaPlaylist.createdBy?.name || "Unknown",
    isPublic: prismaPlaylist.isPublic,
    createdAt: new Date(prismaPlaylist.createdAt),
  };
}

export function transformAd(prismaAd: any): Ad {
  return {
    id: prismaAd.id,
    title: prismaAd.title,
    description: prismaAd.description || "",
    imageUrl: prismaAd.imageUrl || FALLBACK_COVER,
    linkUrl: prismaAd.linkUrl,
    sponsor: prismaAd.sponsor,
  };
}
