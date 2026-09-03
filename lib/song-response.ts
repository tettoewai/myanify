import { withPlaybackUrl } from "./playback-url";
import { shouldIncludeLyrics } from "./song-query";

export function flattenSongLyrics(song: any) {
  // Prefer the requested language's row; fall back to first available
  const rows: unknown[] = Array.isArray(song?.lyrics) ? song.lyrics : [];
  // If song-query already filtered to language:'my', rows is 0 or 1; otherwise pick 'my' or first
  let targetRow: unknown = rows[0];
  if (rows.length > 1) {
    const myRow = rows.find(
      (r: unknown) => (r as { language?: string })?.language === "my",
    );
    if (myRow) targetRow = myRow;
  }
  const lines = Array.isArray((targetRow as { lines?: unknown })?.lines)
    ? (targetRow as { lines: unknown[] }).lines
    : [];

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
