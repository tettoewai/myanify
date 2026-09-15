"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { handleMutationResponse } from "@/lib/api-client";
import { LyricsEditor } from "@/components/admin/lyrics-editor";
import { AdminFormPageSkeleton } from "@/components/loading-skeletons";
import { useSong } from "@/lib/swr";
import type { ParsedLyricLine } from "@/lib/lyric-parser";

function savedSignature(lines: ParsedLyricLine[]): string {
  const s = JSON.stringify(lines);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `${lines.length}-${h}`;
}

export default function SongLyricsPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;
  const { song, isLoading, isError, mutate } = useSong(songId, true, {
    includeLyrics: true,
  });
  // The song's saved LRC JSON — always derived from the fetched song, never
  // overwritten by in-editor edits.
  const savedLyrics = useMemo<ParsedLyricLine[]>(
    () =>
      song && Array.isArray((song as any).lyrics)
        ? ((song as any).lyrics as ParsedLyricLine[])
        : [],
    [song]
  );
  // Working copy. Null = pristine (user hasn't edited yet).
  const [draft, setDraft] = useState<ParsedLyricLine[] | null>(null);
  const [saving, setSaving] = useState(false);

  const activeLyrics = draft ?? savedLyrics;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics: activeLyrics }),
      });
      // Surfaces the API error message and rate-limit guidance (429) on failure.
      await handleMutationResponse(res, {
        fallbackError: "Failed to save lyrics",
      });
      // Refresh the cached song so reopening shows the just-saved JSON.
      await mutate();
      toast.success(`Saved ${activeLyrics.length} lyric lines`);
      router.push("/admin/songs");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <AdminFormPageSkeleton fields={6} />;
  if (isError && !song)
    return (
      <div className="py-12 text-center text-destructive">
        Failed to load this song. Please try again.
      </div>
    );
  if (!song) return <div className="py-12 text-center">Song not found</div>;

  const title = (song as any).title as string;
  // Stream uploaded audio through the /api/audio/stream proxy (like the rest
  // of the app) so syncing works even when raw Cloudinary URLs are blocked.
  const audioUrl = ((song as any).playbackUrl as string) || ((song as any).audioUrl as string);
  const duration = (song as any).duration as number;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/songs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Songs
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold truncate">Lyrics — {title}</h2>
          <p className="text-sm text-muted-foreground">
            Sync timestamps with the audio, preview karaoke, then save. Lines
            are stored as synced JSON and can also be exported as .lrc.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/songs/${songId}/edit`}>Edit song</Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save lyrics ({activeLyrics.length})
              </>
            )}
          </Button>
        </div>
      </div>

      <LyricsEditor
        // While pristine, follow the saved JSON (refresh / revalidation pulls
        // fresh data in). Once edited, the key pins so background refetches
        // never disturb in-progress work.
        key={
          draft === null
            ? `${song.id}:${savedSignature(savedLyrics)}`
            : `${song.id}:draft`
        }
        initialLines={savedLyrics}
        audioUrl={audioUrl}
        audioDuration={duration}
        songTitle={title}
        onChange={setDraft}
      />
    </div>
  );
}
