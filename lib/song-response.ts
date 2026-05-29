import { withPlaybackUrl } from "./playback-url";

export function flattenSongLyrics(song: any) {
  const lyricsRow = song?.lyrics?.[0];
  const lines = Array.isArray(lyricsRow?.lines) ? lyricsRow.lines : [];

  return {
    ...song,
    lyrics: lines,
  };
}

export function formatSongResponse(song: any, request?: Request) {
  return withPlaybackUrl(flattenSongLyrics(song), request);
}

export function formatSongsResponse(songs: any[], request?: Request) {
  return songs.map((song) => formatSongResponse(song, request));
}
