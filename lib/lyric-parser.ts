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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match LRC format: [mm:ss.xx] or [mm:ss:xx] or [mm:ss]
    const timeMatch = trimmed.match(/^\[(\d{2}):(\d{2})(?:[:.](\d{2}))?\]/);
    if (!timeMatch) continue;

    const minutes = parseInt(timeMatch[1], 10);
    const seconds = parseInt(timeMatch[2], 10);
    const centiseconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

    // Convert to seconds
    const timeInSeconds = minutes * 60 + seconds + centiseconds / 100;

    // Extract text after time tag
    const textMatch = trimmed.match(/^\[\d{2}:\d{2}(?:[:.]\d{2})?\](.+)$/);
    if (!textMatch) continue;

    const text = textMatch[1].trim();

    if (text) {
      lyricLines.push({
        time: timeInSeconds,
        text,
        order: order++,
      });
    }
  }

  // Sort by time
  lyricLines.sort((a, b) => a.time - b.time);

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

  // Distribute lyrics evenly across the song duration
  const timeInterval = estimatedDuration / lineCount;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    lyricLines.push({
      time: index * timeInterval,
      text: trimmed,
      order: index + 1,
    });
  });

  return lyricLines;
}


