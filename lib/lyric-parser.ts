/**
 * Parse LRC (Lyrics) file format
 * Supports formats like:
 * [00:12.00]Line 1
 * [00:15.50]Line 2
 */

export interface ParsedLyricLine {
  time: number; // Time in seconds
  text: string; // Lyric text
  order: number; // Line order
}

/**
 * Parse LRC format lyric file
 * @param content - The content of the LRC file
 * @returns Array of parsed lyric lines
 */
export function parseLRC(content: string): ParsedLyricLine[] {
  const lines = content.split("\n");
  const lyricLines: ParsedLyricLine[] = [];
  let order = 1;

  // Matches [m:ss], [mm:ss], [m:ss.xx], [mm:ss.xxx], [mm:ss:xx] — allows 1-2 digit minutes, 2-3 digit fraction
  const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tags = [...trimmed.matchAll(timeTagRegex)];
    if (tags.length === 0) continue;

    // Text is everything after the last time tag
    const lastTag = tags[tags.length - 1];
    const textStart = (lastTag.index ?? 0) + lastTag[0].length;
    const rawText = trimmed.slice(textStart).trim();

    for (const tag of tags) {
      const minutes = parseInt(tag[1], 10);
      const seconds = parseInt(tag[2], 10);
      const fractionRaw = tag[3] ?? "";
      let fractionSeconds = 0;
      if (fractionRaw.length === 2) fractionSeconds = parseInt(fractionRaw, 10) / 100;
      else if (fractionRaw.length === 3) fractionSeconds = parseInt(fractionRaw, 10) / 1000;

      const timeInSeconds = minutes * 60 + seconds + fractionSeconds;

      // Keep instrumental markers (empty text) as timing anchors but mark as empty
      // Only skip lines with no tags; empty text is valid for instrumental gaps
      lyricLines.push({
        time: timeInSeconds,
        text: rawText,
        order: order++,
      });
    }
  }

  // Stable sort by time, then original order for duplicates
  lyricLines.sort((a, b) => a.time - b.time || a.order - b.order);
  // Re-number order after sort to be sequential
  lyricLines.forEach((l, i) => (l.order = i + 1));

  return lyricLines;
}

/**
 * Parse plain text lyric file (one line per lyric, no timestamps)
 * @param content - The content of the text file
 * @param estimatedDuration - Estimated song duration in seconds (for auto-timing)
 * @returns Array of parsed lyric lines
 */
export function parsePlainText(
  content: string,
  estimatedDuration: number = 180
): ParsedLyricLine[] {
  const lines = content.split("\n");
  const lyricLines: ParsedLyricLine[] = [];
  const lineCount = lines.filter((l) => l.trim()).length;

  if (lineCount === 0) return [];

  // Distribute lyrics evenly across the song duration — use compacted index so empty lines don't create gaps
  const timeInterval = estimatedDuration / lineCount;
  let compactIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    lyricLines.push({
      time: compactIndex * timeInterval,
      text: trimmed,
      order: compactIndex + 1,
    });
    compactIndex++;
  }

  return lyricLines;
}


