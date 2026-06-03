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
  
  return {
    id: prismaSong.id,
    title: prismaSong.title,
    artist: artistNames,
    artists: artists.filter((name: string) => name),
    album: prismaSong.album?.name || "",
    albumType: prismaSong.album?.type ?? null,
    duration: prismaSong.duration,
    coverUrl: prismaSong.coverUrl || FALLBACK_COVER,
    albumCoverUrl: prismaSong.album?.coverUrl || null, // Include album cover for fallback
    audioUrl: prismaSong.audioUrl,
    playbackUrl: prismaSong.playbackUrl || getPlaybackUrl(prismaSong.audioUrl),
    genre: prismaSong.genre?.name || "",
    isPremium: prismaSong.isPremium,
    lyrics: (prismaSong.lyrics || []).map((lyric: any): LyricLine => ({
      time: lyric.time,
      text: lyric.text,
    })),
  };
}

export function transformArtist(prismaArtist: any): Artist {
  return {
    id: prismaArtist.id,
    name: prismaArtist.name,
    imageUrl: prismaArtist.imageUrl || FALLBACK_COVER,
    bio: prismaArtist.bio || "",
    monthlyListeners: prismaArtist.monthlyListeners,
    genres: prismaArtist.artistGenres?.map((ag: any) => ag.genre.name) || [],
  };
}

export function transformGenre(prismaGenre: any): Genre {
  return {
    id: prismaGenre.id,
    name: prismaGenre.name,
    imageUrl: prismaGenre.imageUrl || FALLBACK_COVER,
    description: prismaGenre.description || "",
  };
}

export function transformPlaylist(prismaPlaylist: any): Playlist {
  return {
    id: prismaPlaylist.id,
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
