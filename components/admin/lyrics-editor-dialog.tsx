"use client";

import { useRef, useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LyricsEditor } from "@/components/admin/lyrics-editor";
import type { ParsedLyricLine } from "@/lib/lyric-parser";

interface LyricsEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLines: ParsedLyricLine[];
  audioUrl?: string;
  audioDuration?: number;
  songTitle?: string;
  onApply: (lines: ParsedLyricLine[]) => void;
}

export function LyricsEditorDialog({
  open,
  onOpenChange,
  initialLines,
  audioUrl,
  audioDuration,
  songTitle,
  onApply,
}: LyricsEditorDialogProps) {
  const latestRef = useRef<ParsedLyricLine[]>(initialLines);
  const [key, setKey] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          latestRef.current = initialLines;
          setKey((k) => k + 1);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced lyrics editor</DialogTitle>
          <DialogDescription>
            Paste lyrics, stamp timestamps with Space while the audio plays,
            fine-tune per line, then Apply to attach the synced lines to this
            song.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <LyricsEditor
            key={key}
            initialLines={initialLines}
            audioUrl={audioUrl}
            audioDuration={audioDuration}
            songTitle={songTitle}
            onChange={(lines) => {
              latestRef.current = lines;
            }}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(latestRef.current);
              onOpenChange(false);
            }}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Apply {latestRef.current.length > 0
              ? `(${latestRef.current.length} lines)`
              : "lyrics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
