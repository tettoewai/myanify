import { withPlaybackUrl } from "./playback-url";
import { shouldIncludeLyrics } from "./song-query";

export function flattenSongLyrics(song: any) {
  const lyricsRow = song?.lyrics?.[0];
  const lines = Array.isArray(lyricsRow?.lines) ? lyricsRow.lines : [];

  return {
    ...song,
    lyrics: lines,
  };
}

function stripLyrics(song: any) {
  const { lyrics: _lyrics, ...rest } = song;
  return rest;
}

export function formatSongResponse(
  song: any,
  request?: Request,
  options?: { includeLyrics?: boolean },
) {
  const includeLyrics =
    options?.includeLyrics ?? (request ? shouldIncludeLyrics(request) : false);

  const formatted = includeLyrics ? flattenSongLyrics(song) : stripLyrics(song);
  return withPlaybackUrl(formatted, request);
}

export function formatSongsResponse(
  songs: any[],
  request?: Request,
  options?: { includeLyrics?: boolean },
) {
  return songs.map((song) => formatSongResponse(song, request, options));
}
