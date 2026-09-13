export const SONG_MOODS = [
  "happy",
  "sad",
  "energetic",
  "chill",
  "romantic",
  "mellow",
  "uplifting",
  "melancholic",
  "party",
  "focus",
  "traditional",
  "soulful",
] as const;

export type SongMood = (typeof SONG_MOODS)[number];

export function normalizeMood(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const found = (SONG_MOODS as readonly string[]).find((m) => m === v);
  return found ?? v.slice(0, 32);
}

export function normalizeTags(value: unknown): string[] {
  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set<string>();
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const v = t.trim().toLowerCase().slice(0, 32);
    if (v) seen.add(v);
    if (seen.size >= 10) break;
  }
  return [...seen];
}
