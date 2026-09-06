"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  Crown,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOffline } from "@/components/offline-provider";
import type { OfflineTrack } from "@/lib/offline-storage";
import { requireLoginRedirect } from "@/lib/require-login";
import { cn, getSongCoverUrl } from "@/lib/utils";
import type { Song } from "@/lib/types";

interface InitiateResponse {
  playbackUrl?: string;
  audioUrl?: string;
  error?: string;
  message?: string;
}

/**
 * Shared per-song download action: server entitlement first
 * (`POST /api/vip/downloads` enforces VIP + limits), then local queue + drain.
 */
export function useDownloadSong(song: Song) {
  const { tracks, queueTrack, downloadNext, isSupported } = useOffline();
  const [busy, setBusy] = useState(false);

  const track: OfflineTrack | undefined = tracks.find(
    (t) => t.songId === song.id,
  );

  const start = useCallback(async () => {
    if (!isSupported) {
      toast.error("Offline downloads aren't supported in this browser");
      return;
    }
    if (busy) return;
    if (track?.status === "queued" || track?.status === "downloading") {
      toast.message("Already in your download queue");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/vip/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id }),
      });
      const data = (await res.json().catch(() => ({}))) as InitiateResponse;
      if (res.status === 401) {
        requireLoginRedirect(undefined, "save");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Download not allowed");
        return;
      }
      const queued = await queueTrack({
        songId: song.id,
        playbackUrl: data.playbackUrl ?? song.playbackUrl,
        title: song.title,
        artistName: song.artist,
        coverUrl: getSongCoverUrl(song),
        durationSec: song.duration,
      });
      if (!queued) return;
      await downloadNext();
      toast.success(`Downloading "${song.title}" for offline`);
    } catch {
      toast.error("Download failed — check your connection and retry");
    } finally {
      setBusy(false);
    }
  }, [busy, downloadNext, isSupported, queueTrack, song, track?.status]);

  return { track, busy, start };
}

/**
 * Visible per-row download action for song lists.
 * Always visible on touch/mobile (no hover there), hover-revealed on desktop.
 * Requires an ancestor with the `group` class. Stops propagation so row-level
 * play handlers don't fire when tapping the button.
 */
export function SongRowDownload({
  song,
  className,
}: {
  song: Song;
  className?: string;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity",
        className,
      )}
    >
      <DownloadButton song={song} variant="icon" className="h-8 w-8" />
    </div>
  );
}
const STATUS_META: Record<
  OfflineTrack["status"],
  { label: string; icon: typeof Download }
> = {
  queued: { label: "Queued", icon: Clock },
  downloading: { label: "Downloading", icon: Loader2 },
  completed: { label: "Downloaded", icon: Check },
  failed: { label: "Retry download", icon: AlertTriangle },
  evicted: { label: "Re-download", icon: RefreshCw },
  expired: { label: "Expired", icon: Crown },
  cancelled: { label: "Download", icon: Download },
};

export function DownloadButton({
  song,
  variant = "default",
  className,
}: {
  song: Song;
  variant?: "default" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const { track, busy, start } = useDownloadSong(song);

  if (!track) {
    const label = "Download";
    if (variant === "icon") {
      return (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Download ${song.title} for offline`}
          title={label}
          disabled={busy}
          onClick={() => void start()}
          className={className}
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
        </Button>
      );
    }
    return (
      <Button
        size="lg"
        variant="outline"
        className={cn("rounded-full", className)}
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Download className="w-5 h-5 mr-2" />
        )}
        {label}
      </Button>
    );
  }

  const meta = STATUS_META[track.status];
  const Icon = meta.icon;
  const spin = track.status === "downloading";

  const handleClick = () => {
    if (track.status === "completed") {
      router.push("/downloads");
      return;
    }
    if (track.status === "queued" || track.status === "downloading") return;
    void start();
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`${meta.label}: ${song.title}`}
        title={
          track.status === "downloading"
            ? `${track.progress}%`
            : meta.label
        }
        disabled={spin || track.status === "queued" || busy}
        onClick={handleClick}
        className={className}
      >
        {spin ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      variant={track.status === "completed" ? "default" : "outline"}
      className={cn("rounded-full", className)}
      disabled={spin || track.status === "queued" || busy}
      onClick={handleClick}
    >
      <Icon className={cn("w-5 h-5 mr-2", spin && "animate-spin")} />
      {spin ? `${meta.label} ${track.progress}%` : meta.label}
    </Button>
  );
}
