"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  FileText,
  History,
  ListMusic,
  Minus,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLyricsAudio } from "@/hooks/use-lyrics-audio";
import type { ParsedLyricLine } from "@/lib/lyric-parser";
import {
  createEditorId,
  distributeUnsynced,
  editorToParsed,
  formatClock,
  formatLrcTimestamp,
  generateLrcText,
  mergeEditorLines,
  parseLrcFileText,
  parseLrcTimestampInput,
  parsedToEditor,
  sortLinesByTime,
  syncedCount,
  type EditorLyricLine,
} from "@/lib/lyrics-editor-utils";
import { cn } from "@/lib/utils";

interface UndoAction {
  lineId: string;
  prev: number | null;
  next: number | null;
}

interface LyricsEditorProps {
  initialLines?: ParsedLyricLine[];
  audioUrl?: string;
  audioDuration?: number;
  songTitle?: string;
  onChange?: (lines: ParsedLyricLine[]) => void;
}

export function LyricsEditor({
  initialLines = [],
  audioUrl,
  audioDuration,
  songTitle,
  onChange,
}: LyricsEditorProps) {
  const [lines, setLines] = useState<EditorLyricLine[]>(() =>
    parsedToEditor(initialLines)
  );
  const [pasteText, setPasteText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [timeDraft, setTimeDraft] = useState("");
  const [textDraft, setTextDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lrcFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  // Snapshot of the song's saved LRC JSON (mount-time initial lines).
  // Never overwritten by in-editor edits, so "Restore saved" always brings
  // back the previous lyrics from the song table.
  const savedRef = useRef<ParsedLyricLine[] | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const audio = useLyricsAudio({
    initialUrl: audioUrl,
    initialDuration: audioDuration,
  });

  // Initial lines are adopted once via the useState initializer (parents
  // remount the editor via `key` when switching songs / reloading saved data).

  // Snapshot the song's saved LRC JSON on first sight (survives in-editor
  // edits because the guard only allows the first capture).
  useEffect(() => {
    if (savedRef.current === null && initialLines.length > 0) {
      savedRef.current = initialLines;
      setSavedCount(initialLines.length);
    }
  }, [initialLines]);

  const restoreSaved = useCallback(() => {
    if (!savedRef.current || savedRef.current.length === 0) {
      toast.error("No saved lyrics for this song yet");
      return;
    }
    setLines(parsedToEditor(savedRef.current));
    setCurrentIndex(0);
    setOffset(0);
    setUndoStack([]);
    setRedoStack([]);
    toast.success(
      `Restored ${savedRef.current.length} saved lines from song table`
    );
  }, []);

  useEffect(() => {
    if (audioUrl) audio.setUrl(audioUrl, audioDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Emit parsed lines upward on edit. The mount echo is skipped so parents
  // can tell pristine (song's saved JSON) apart from user-edited lines.
  const firstEmitRef = useRef(true);
  useEffect(() => {
    if (firstEmitRef.current) {
      firstEmitRef.current = false;
      return;
    }
    onChange?.(editorToParsed(lines));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const pushUndo = useCallback((a: UndoAction) => {
    setUndoStack((p) => [...p, a]);
    setRedoStack([]);
  }, []);

  const stampLine = useCallback(
    (index: number, time: number) => {
      setLines((prev) => {
        const line = prev[index];
        if (!line) return prev;
        pushUndo({ lineId: line.id, prev: line.time, next: time });
        return prev.map((l, i) => (i === index ? { ...l, time } : l));
      });
    },
    [pushUndo]
  );

  const doUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      setRedoStack((r) => [...r, action]);
      setLines((ls) =>
        ls.map((l) => (l.id === action.lineId ? { ...l, time: action.prev } : l))
      );
      return prev.slice(0, -1);
    });
  }, []);

  const doRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      setUndoStack((u) => [...u, action]);
      setLines((ls) =>
        ls.map((l) => (l.id === action.lineId ? { ...l, time: action.next } : l))
      );
      return prev.slice(0, -1);
    });
  }, []);

  // Space to stamp / arrows to seek / ctrl+z/y
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (audio.isPlaying && lines.length > 0) {
          stampLine(currentIndex, audio.currentTime);
          if (currentIndex < lines.length - 1)
            setCurrentIndex((i) => i + 1);
        }
      } else if (e.code === "ArrowLeft" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        audio.seekRelative(-5);
      } else if (e.code === "ArrowRight" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        audio.seekRelative(5);
      } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey))
      ) {
        e.preventDefault();
        doRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audio, lines.length, currentIndex, stampLine, doUndo, doRedo]);

  // Auto-scroll active edit line into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-line-index="${currentIndex}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex]);

  const activePlaybackIndex = useMemo(() => {
    const t = audio.currentTime - offset;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].time !== null && (lines[i].time as number) <= t) return i;
    }
    return -1;
  }, [lines, audio.currentTime, offset]);

  const karaoke = useMemo(() => {
    const cur = activePlaybackIndex >= 0 ? lines[activePlaybackIndex] : null;
    const prev = activePlaybackIndex > 0 ? lines[activePlaybackIndex - 1] : null;
    const next =
      activePlaybackIndex < lines.length - 1
        ? lines[activePlaybackIndex + 1]
        : activePlaybackIndex === -1 && lines.length > 0
          ? lines[0]
          : null;
    return { prev, cur, next };
  }, [lines, activePlaybackIndex]);

  const lrcText = useMemo(() => generateLrcText(lines, { offset }), [lines, offset]);

  const loadPaste = useCallback(() => {
    const rows = pasteText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    if (rows.length === 0) {
      toast.error("Paste some lyrics first");
      return;
    }
    const incoming = rows.map((text) => ({
      id: createEditorId(),
      text,
      time: null as number | null,
    }));
    // Carry previous timestamps over to matching lines
    const { merged, reused } = mergeEditorLines(lines, incoming);
    setLines(merged);
    setCurrentIndex(0);
    setUndoStack([]);
    setRedoStack([]);
    setPasteText("");
    toast.success(
      `Loaded ${merged.length} lines${reused > 0 ? `, restored ${reused} previous timestamps` : ""}`
    );
  }, [pasteText, lines]);

  const loadLrcFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const incoming = parseLrcFileText(text);
      if (incoming.length === 0) {
        toast.error("No lyrics found in file");
        return;
      }
      // Carry previous timestamps over to matching lines
      const { merged, reused } = mergeEditorLines(lines, incoming);
      setLines(merged);
      setCurrentIndex(0);
      setUndoStack([]);
      setRedoStack([]);
      toast.success(
        `Loaded ${merged.length} lines${reused > 0 ? `, restored ${reused} previous timestamps` : ""}`
      );
    },
    [lines]
  );

  const setTime = useCallback(
    (id: string, time: number | null) => {
      const line = lines.find((l) => l.id === id);
      if (!line) return;
      pushUndo({ lineId: id, prev: line.time, next: time });
      setLines((prev) => prev.map((l) => (l.id === id ? { ...l, time } : l)));
    },
    [lines, pushUndo]
  );

  const nudge = useCallback(
    (id: string, delta: number) => {
      const line = lines.find((l) => l.id === id);
      if (!line || line.time === null) return;
      setTime(id, Math.max(0, line.time + delta));
    },
    [lines, setTime]
  );

  const shiftAll = useCallback(
    (delta: number) => {
      setLines((prev) =>
        prev.map((l) =>
          l.time === null ? l : { ...l, time: Math.max(0, l.time + delta) }
        )
      );
      toast.success(`Shifted all by ${delta > 0 ? "+" : ""}${delta.toFixed(2)}s`);
    },
    []
  );

  const applyOffset = useCallback(() => {
    if (offset === 0) return;
    setLines((prev) =>
      prev.map((l) =>
        l.time === null ? l : { ...l, time: Math.max(0, l.time + offset) }
      )
    );
    setOffset(0);
    toast.success("Offset applied to timestamps");
  }, [offset]);

  const moveLine = useCallback(
    (index: number, dir: -1 | 1) => {
      const j = index + dir;
      if (j < 0 || j >= lines.length) return;
      setLines((prev) => {
        const next = [...prev];
        [next[index], next[j]] = [next[j], next[index]];
        return next;
      });
      setCurrentIndex(j);
    },
    [lines.length]
  );

  const addLine = useCallback(
    (index: number, pos: "above" | "below") => {
      const nl: EditorLyricLine = { id: createEditorId(), text: "", time: null };
      setLines((prev) => {
        const next = [...prev];
        next.splice(pos === "above" ? index : index + 1, 0, nl);
        return next;
      });
      if (pos === "above" && currentIndex >= index)
        setCurrentIndex((i) => i + 1);
    },
    [currentIndex]
  );

  const deleteLine = useCallback(
    (index: number) => {
      if (lines.length <= 1) {
        toast.error("Keep at least one line");
        return;
      }
      setLines((prev) => prev.filter((_, i) => i !== index));
      if (currentIndex >= index && currentIndex > 0)
        setCurrentIndex((i) => i - 1);
    },
    [lines.length, currentIndex]
  );

  const copyLrc = useCallback(async () => {
    await navigator.clipboard.writeText(lrcText);
    toast.success("LRC copied to clipboard");
  }, [lrcText]);

  const downloadLrc = useCallback(() => {
    const blob = new Blob([lrcText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${songTitle || "lyrics"}.lrc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lrcText, songTitle]);

  return (
    <TooltipProvider>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main sync workspace */}
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ListMusic className="h-4 w-4" />
                Lyrics Sync
                <Badge variant="secondary" className="font-mono">
                  {syncedCount(lines)}/{lines.length}
                </Badge>
              </CardTitle>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={doUndo}
                      disabled={undoStack.length === 0}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={doRedo}
                      disabled={redoStack.length === 0}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text tools */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Paste lyrics or load file
                </Label>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => lrcFileRef.current?.click()}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Load .lrc/.txt
                  </Button>
                  <input
                    ref={lrcFileRef}
                    type="file"
                    accept=".lrc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void loadLrcFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste lyrics here, one line per line… then press Use lines"
                className="min-h-[90px] font-mono text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={loadPaste}>
                  Use lines
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={savedCount === 0}
                  onClick={restoreSaved}
                  title="Reload the previous LRC JSON saved for this song"
                >
                  <History className="h-3 w-3 mr-1" />
                  Restore saved{savedCount > 0 ? ` (${savedCount})` : ""}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={lines.length === 0}
                  onClick={() => setLines(sortLinesByTime(lines))}
                >
                  Sort by time
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={lines.length === 0 || audio.duration <= 0}
                  onClick={() =>
                    setLines(distributeUnsynced(lines, audio.duration || 180))
                  }
                >
                  Auto-distribute
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={lines.length === 0}
                  onClick={() => shiftAll(0.5)}
                >
                  +0.5s all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={lines.length === 0}
                  onClick={() => shiftAll(-0.5)}
                >
                  −0.5s all
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={lines.length === 0}
                  onClick={() => {
                    setLines((prev) =>
                      prev.map((l) => ({ ...l, time: null }))
                    );
                    setUndoStack([]);
                    setRedoStack([]);
                  }}
                >
                  Clear times
                </Button>
              </div>
            </div>

            {/* Sync list */}
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-6 text-center">
                No lyric lines yet. Paste lyrics above or load an LRC file.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Line {Math.min(currentIndex + 1, lines.length)} of{" "}
                    {lines.length} — Space stamps, click a row to select
                  </span>
                </div>
                <ScrollArea className="h-[380px] pr-3" ref={listRef as never}>
                  <div className="space-y-1">
                    {lines.map((line, index) => (
                      <div
                        key={line.id}
                        data-line-index={index}
                        onClick={() => setCurrentIndex(index)}
                        className={cn(
                          "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors relative",
                          index === currentIndex &&
                            "bg-primary/10 ring-1 ring-primary/30",
                          index === activePlaybackIndex &&
                            index !== currentIndex &&
                            "bg-accent/60",
                          index !== currentIndex &&
                            index !== activePlaybackIndex &&
                            "hover:bg-accent/30"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1.5 left-1/2 h-4 w-4 -translate-x-1/2 border bg-background opacity-0 group-hover:opacity-100 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            addLine(index, "above");
                          }}
                          title="Add line above"
                        >
                          <Plus className="h-2 w-2" />
                        </Button>

                        <div className="w-44 shrink-0">
                          {editingTimeId === line.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={timeDraft}
                                onChange={(e) => setTimeDraft(e.target.value)}
                                placeholder="00:00.00"
                                className="h-6 px-1 font-mono text-xs"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const t =
                                      parseLrcTimestampInput(timeDraft);
                                    setTime(line.id, t);
                                    setEditingTimeId(null);
                                  }
                                  if (e.key === "Escape")
                                    setEditingTimeId(null);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTime(
                                    line.id,
                                    parseLrcTimestampInput(timeDraft)
                                  );
                                  setEditingTimeId(null);
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-0.5">
                              {line.time !== null && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-50 hover:opacity-100"
                                  title="-10ms"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    nudge(line.id, -0.01);
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              )}
                              <Badge
                                variant={
                                  line.time !== null ? "default" : "secondary"
                                }
                                className="cursor-pointer font-mono text-[11px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTimeId(line.id);
                                  setTimeDraft(
                                    line.time !== null
                                      ? formatLrcTimestamp(line.time).slice(
                                          1,
                                          -1
                                        )
                                      : ""
                                  );
                                }}
                              >
                                {line.time !== null
                                  ? formatLrcTimestamp(line.time)
                                  : "Unsynced"}
                              </Badge>
                              {line.time !== null && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-50 hover:opacity-100"
                                    title="+10ms"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      nudge(line.id, 0.01);
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-50 hover:opacity-100"
                                    title="Play from here"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      audio.seek(line.time as number);
                                      if (!audio.isPlaying)
                                        audio.togglePlay();
                                    }}
                                  >
                                    <Play className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-50 hover:opacity-100"
                                    title="Clear timestamp"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTime(line.id, null);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {editingTextId === line.id ? (
                          <div className="flex flex-1 items-center gap-1">
                            <Input
                              value={textDraft}
                              onChange={(e) => setTextDraft(e.target.value)}
                              className="h-7 flex-1 text-sm"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setLines((prev) =>
                                    prev.map((l) =>
                                      l.id === line.id
                                        ? { ...l, text: textDraft }
                                        : l
                                    )
                                  );
                                  setEditingTextId(null);
                                }
                                if (e.key === "Escape")
                                  setEditingTextId(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLines((prev) =>
                                  prev.map((l) =>
                                    l.id === line.id
                                      ? { ...l, text: textDraft }
                                      : l
                                  )
                                );
                                setEditingTextId(null);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "flex-1 cursor-text text-sm hover:underline",
                              !line.text.trim() &&
                                "italic text-muted-foreground"
                            )}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingTextId(line.id);
                              setTextDraft(line.text);
                            }}
                            title="Double-click to edit text"
                          >
                            {line.text || "(empty line)"}
                          </span>
                        )}

                        <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Move up"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLine(index, -1);
                            }}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title="Move down"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLine(index, 1);
                            }}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            title="Delete line"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLine(index);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -bottom-1.5 left-1/2 h-4 w-4 -translate-x-1/2 border bg-background opacity-0 group-hover:opacity-100 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            addLine(index, "below");
                          }}
                          title="Add line below"
                        >
                          <Plus className="h-2 w-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* Side: audio + karaoke + output */}
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Audio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => audioFileRef.current?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {audio.fileName ?? "Preview file"}
                </Button>
                <input
                  ref={audioFileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      audio.loadFile(f);
                      toast.success("Local audio loaded for syncing");
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              {!audio.hasAudio ? (
                <p className="text-xs text-muted-foreground">
                  {audioUrl
                    ? "Loading uploaded audio…"
                    : "Load a local audio file to sync, or save the song first to use its uploaded audio."}
                </p>
              ) : (
                <>
                  {audio.isLocalFile && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      Preview: {audio.fileName}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => audio.seekRelative(-5)}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button size="icon" onClick={audio.togglePlay}>
                      {audio.isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => audio.seekRelative(5)}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="ml-1 text-xs"
                      disabled={!audio.isPlaying && lines.length === 0}
                      onClick={() => {
                        if (lines.length === 0) return;
                        stampLine(currentIndex, audio.currentTime);
                        if (currentIndex < lines.length - 1)
                          setCurrentIndex((i) => i + 1);
                      }}
                      title="Stamp current line (Space)"
                    >
                      Stamp
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Slider
                      value={[audio.currentTime]}
                      max={audio.duration || 100}
                      step={0.1}
                      onValueChange={([v]) => audio.seek(v)}
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                      <span>{formatClock(audio.currentTime)}</span>
                      <span>{formatClock(audio.duration)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Space: stamp · ←/→: ±5s · Ctrl+Z / Ctrl+Shift+Z
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Karaoke preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-accent/30 p-4 h-28 flex flex-col items-center justify-center overflow-hidden">
                <p className="text-xs text-muted-foreground truncate opacity-60 w-full text-center">
                  {karaoke.prev?.text || " "}
                </p>
                <p
                  className={cn(
                    "text-base font-medium truncate w-full text-center",
                    karaoke.cur ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {karaoke.cur?.text || "♪ ♪ ♪"}
                </p>
                <p className="text-xs text-muted-foreground truncate opacity-60 w-full text-center">
                  {karaoke.next?.text || " "}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">LRC output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">
                  Offset: {offset > 0 ? "+" : ""}
                  {offset.toFixed(2)}s
                </Label>
                <Slider
                  value={[offset]}
                  min={-5}
                  max={5}
                  step={0.01}
                  onValueChange={([v]) => setOffset(v)}
                />
                {offset !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full text-xs"
                    onClick={applyOffset}
                  >
                    Apply offset to timestamps
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={copyLrc}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={downloadLrc}
                >
                  <Download className="h-3 w-3 mr-1" />
                  .lrc
                </Button>
              </div>
              <ScrollArea className="h-[160px] rounded-md border bg-muted/30 p-3">
                <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">
                  {lrcText || "LRC preview will appear here…"}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
