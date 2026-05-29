// Transform Prisma data to match frontend types
import type { Song, Artist, Playlist, Genre, Ad, LyricLine } from "./types";
import { getPlaybackUrl } from "./playback-url";

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
    duration: prismaSong.duration,
    coverUrl: prismaSong.coverUrl || "/placeholder.svg",
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
    imageUrl: prismaArtist.imageUrl || "/placeholder.svg",
    bio: prismaArtist.bio || "",
    monthlyListeners: prismaArtist.monthlyListeners,
    genres: prismaArtist.artistGenres?.map((ag: any) => ag.genre.name) || [],
  };
}

export function transformGenre(prismaGenre: any): Genre {
  return {
    id: prismaGenre.id,
    name: prismaGenre.name,
    imageUrl: prismaGenre.imageUrl || "/placeholder.svg",
    description: prismaGenre.description || "",
  };
}

export function transformPlaylist(prismaPlaylist: any): Playlist {
  return {
    id: prismaPlaylist.id,
    name: prismaPlaylist.name,
    description: prismaPlaylist.description || "",
    coverUrl: prismaPlaylist.coverUrl || "/placeholder.svg",
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
    imageUrl: prismaAd.imageUrl || "/placeholder.svg",
    linkUrl: prismaAd.linkUrl,
    sponsor: prismaAd.sponsor,
  };
}
