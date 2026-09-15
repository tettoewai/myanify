import { parseLRC, type ParsedLyricLine } from "@/lib/lyric-parser";

export interface EditorLyricLine {
  id: string;
  text: string;
  time: number | null; // seconds, null = unsynced
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEditorId() {
  return newId();
}

export function parsedToEditor(lines: ParsedLyricLine[]): EditorLyricLine[] {
  return lines.map((l) => ({
    id: newId(),
    text: l.text ?? "",
    time: typeof l.time === "number" && Number.isFinite(l.time) ? l.time : null,
  }));
}

export function editorToParsed(lines: EditorLyricLine[]): ParsedLyricLine[] {
  // Preserve visual order; drop fully-empty lines but keep instrumental
  // markers (empty text WITH timestamp) as timing anchors.
  const kept = lines.filter((l) => l.text.trim() !== "" || l.time !== null);
  return kept.map((l, i) => ({
    time: l.time ?? 0,
    text: l.text,
    order: i + 1,
  }));
}

export function formatLrcTimestamp(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "[--:--.--]";
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `[${String(mins).padStart(2, "0")}:${secs.toFixed(2).padStart(5, "0")}]`;
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseLrcTimestampInput(input: string): number | null {
  const tag = input.trim().startsWith("[") ? input.trim() : `[${input.trim()}]`;
  const m = tag.match(/\[(\d{1,2}):(\d{2})(?:[:.](\d{2,3}))?\]/);
  if (!m) return null;
  const mins = parseInt(m[1], 10);
  const secs = parseInt(m[2], 10);
  const frac = m[3] ?? "";
  let fracSec = 0;
  if (frac.length === 2) fracSec = parseInt(frac, 10) / 100;
  else if (frac.length === 3) fracSec = parseInt(frac, 10) / 1000;
  return mins * 60 + secs + fracSec;
}

export function generateLrcText(
  lines: EditorLyricLine[],
  opts?: { offset?: number }
): string {
  const offset = opts?.offset ?? 0;
  const body = lines
    .filter((l) => l.text.trim() !== "" || l.time !== null)
    .map((l) => {
      if (l.time === null) return l.text;
      return `${formatLrcTimestamp(l.time + offset)} ${l.text}`;
    });
  if (offset !== 0) {
    return `[offset:${Math.round(offset * 1000)}]\n${body.join("\n")}`;
  }
  return body.join("\n");
}

export function parseLrcFileText(content: string): EditorLyricLine[] {
  const parsed = parseLRC(content);
  if (parsed.length > 0) return parsedToEditor(parsed);
  // Fallback: treat as plain text, one unsynced line per non-empty row.
  // Also strip a leading [--:--.--] placeholder if present.
  const out: EditorLyricLine[] = [];
  for (const raw of content.split("\n")) {
    let text = raw.trim();
    if (!text) continue;
    if (text.startsWith("[--:--.--]")) {
      text = text.slice("[--:--.--]".length).trimStart();
    }
    if (!text) continue;
    out.push({ id: newId(), text, time: null });
  }
  return out;
}

export function distributeUnsynced(
  lines: EditorLyricLine[],
  duration: number
): EditorLyricLine[] {
  if (lines.length === 0 || duration <= 0) return lines;
  const total = lines.length;
  return lines.map((l, i) => ({
    ...l,
    time: l.time ?? (duration * i) / total,
  }));
}

export function sortLinesByTime(lines: EditorLyricLine[]): EditorLyricLine[] {
  return [...lines].sort((a, b) => {
    if (a.time === null && b.time === null) return 0;
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time - b.time;
  });
}

export function syncedCount(lines: EditorLyricLine[]): number {
  return lines.filter((l) => l.time !== null).length;
}

function normText(t: string): string {
  return t.trim().toLowerCase();
}

/**
 * Merge incoming lines with previously synced ones.
 * The incoming content defines the line set; timestamps from the previous
 * lyrics are carried over to lines with matching text (consumed in order).
 * Lines without a match keep their incoming timestamp (LRC) or stay unsynced.
 */
export function mergeEditorLines(
  prev: EditorLyricLine[],
  incoming: EditorLyricLine[]
): { merged: EditorLyricLine[]; reused: number } {
  if (prev.length === 0) return { merged: incoming, reused: 0 };
  const pool = new Map<string, (number | null)[]>();
  for (const l of prev) {
    const k = normText(l.text);
    if (!k) continue;
    if (!pool.has(k)) pool.set(k, []);
    pool.get(k)!.push(l.time);
  }
  let reused = 0;
  const merged = incoming.map((l) => {
    const q = pool.get(normText(l.text));
    if (q && q.length > 0) {
      const t = q.shift()!;
      if (t !== null) reused++;
      return { ...l, time: t };
    }
    return l;
  });
  return { merged, reused };
}

/**
 * Same merge for DB-shaped lines. Set `incomingHasRealTimes: false` when the
 * incoming lines carry synthetic times (e.g. evenly auto-distributed plain
 * text) so previous manual sync wins on text matches instead.
 */
export function mergeParsedLines(
  prev: ParsedLyricLine[],
  incoming: ParsedLyricLine[],
  opts?: { incomingHasRealTimes?: boolean }
): { merged: ParsedLyricLine[]; reused: number } {
  if (prev.length === 0) return { merged: incoming, reused: 0 };
  const hasReal = opts?.incomingHasRealTimes ?? true;
  const incEd = parsedToEditor(incoming).map((l) =>
    hasReal ? l : { ...l, time: null }
  );
  const { merged, reused } = mergeEditorLines(parsedToEditor(prev), incEd);
  return { merged: editorToParsed(merged), reused };
}
