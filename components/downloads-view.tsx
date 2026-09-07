"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Check,
  Crown,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOffline } from "@/components/offline-provider";
import { usePlayer } from "@/components/player-context";
import { offlineStorage, type OfflineTrack } from "@/lib/offline-storage";
import { OFFLINE_COPY } from "@/lib/offline-platform";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(sec: number | null): string {
  if (sec === null || sec === undefined) return "";
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
}

function TrackRow({
  track,
  onRetry,
  onRemove,
  onPlay,
  retrying,
}: {
  track: OfflineTrack;
  onRetry: (track: OfflineTrack) => void;
  onRemove: (track: OfflineTrack) => void;
  onPlay: (track: OfflineTrack) => void;
  retrying: boolean;
}) {
  const isActive =
    track.status === "queued" || track.status === "downloading";

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-card/50 border border-border">
      <div className="relative shrink-0">
        <Image
          src={track.coverUrl || "/placeholder.svg"}
          alt={track.title}
          width={56}
          height={56}
          className="w-14 h-14 rounded-lg object-cover"
          unoptimized
        />
        {track.status === "completed" && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-primary-foreground" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{track.title || "Unknown title"}</p>
        <p className="text-sm text-muted-foreground truncate">
          {track.artistName}
          {formatDuration(track.durationSec)
            ? ` · ${formatDuration(track.durationSec)}`
            : ""}
          {track.fileSize ? ` · ${formatBytes(track.fileSize)}` : ""}
        </p>
        {track.status === "downloading" && (
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${track.progress}%` }}
            />
          </div>
        )}
        {track.status === "failed" && track.error && (
          <p className="mt-1 text-xs text-destructive truncate">{track.error}</p>
        )}
        {track.status === "evicted" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Cleared by the system — tap to download again
          </p>
        )}
        {track.status === "expired" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Subscription ended — renew VIP to download again
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {track.status === "completed" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Play ${track.title} offline`}
            title="Play offline"
            onClick={() => onPlay(track)}
          >
            <Play className="w-5 h-5" />
          </Button>
        )}
        {(track.status === "failed" || track.status === "evicted") && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Retry download of ${track.title}`}
            title="Retry"
            disabled={retrying}
            onClick={() => onRetry(track)}
          >
            {retrying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </Button>
        )}
        {!isActive && track.status !== "expired" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${track.title} from downloads`}
            title="Remove"
            onClick={() => onRemove(track)}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function DownloadsView() {
  const {
    platform,
    tracks,
    queue,
    quota,
    isSupported,
    isReconciling,
    queueTrack,
    downloadNext,
    remove,
    refresh,
  } = useOffline();
  const { playSong } = usePlayer();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [draining, setDraining] = useState(false);
  // Platform is resolved post-mount; until then keep SSR/CSR initial markup
  // identical so hydration doesn't mismatch on the platform copy.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Until mounted, isSupported/platform are still at their SSR defaults and
  // could diverge after hydration — render a stable shell to avoid breaking
  // React's hydration.
  if (!mounted) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto pb-32">
        <h1 className="text-2xl font-bold mb-1">Downloads</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Saved for offline listening
        </p>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto pb-32">
        <h1 className="text-2xl font-bold mb-1">Downloads</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Offline downloads aren&apos;t supported in this browser.
        </p>
      </div>
    );
  }

  const active = tracks.filter(
    (t) => t.status === "queued" || t.status === "downloading",
  );
  const completed = tracks.filter((t) => t.status === "completed");
  const attention = tracks.filter(
    (t) =>
      t.status === "failed" ||
      t.status === "evicted" ||
      t.status === "expired",
  );

  const usage = quota?.usage ?? null;
  const quotaTotal = quota?.quota ?? null;
  const usagePct =
    usage !== null && quotaTotal
      ? Math.min(100, Math.round((usage / quotaTotal) * 100))
      : null;

  const handleRetry = async (track: OfflineTrack) => {
    setRetryingId(track.songId);
    try {
      const res = await fetch("/api/vip/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: track.songId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        playbackUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Download not allowed");
        return;
      }
      await queueTrack({
        songId: track.songId,
        playbackUrl: data.playbackUrl ?? track.playbackUrl,
        title: track.title,
        artistName: track.artistName,
        coverUrl: track.coverUrl,
        durationSec: track.durationSec,
      });
      await downloadNext();
    } catch {
      toast.error("Retry failed — check your connection");
    } finally {
      setRetryingId(null);
    }
  };

  const handleRemove = async (track: OfflineTrack) => {
    await remove(track.songId);
    toast.success(`Removed "${track.title}"`);
  };

  const handlePlayOffline = async (track: OfflineTrack) => {
    const blobUrl = await offlineStorage.getAudioUrl(track.songId);
    if (!blobUrl) {
      toast.error("File unavailable — try downloading again");
      await refresh();
      return;
    }
    playSong({
      id: track.songId,
      slug: "",
      title: track.title,
      artist: track.artistName,
      album: "",
      duration: track.durationSec ?? 0,
      coverUrl: track.coverUrl ?? "/placeholder.svg",
      audioUrl: track.playbackUrl,
      playbackUrl: blobUrl,
      genre: "",
      isPremium: false,
    } as Song);
  };

  const handleDrainAll = async () => {
    if (draining) return;
    setDraining(true);
    try {
      for (;;) {
        const worked = await downloadNext();
        if (!worked) break;
      }
    } finally {
      setDraining(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto pb-32">
      <h1 className="text-2xl font-bold mb-1">Downloads</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {OFFLINE_COPY[platform.platform]}
      </p>

      {/* Storage meter */}
      <div className="rounded-xl bg-card/60 border border-border/50 p-4 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Offline storage</span>
          <span className="text-muted-foreground">
            {formatBytes(usage)}
            {quotaTotal ? ` of ${formatBytes(quotaTotal)}` : ""}
            {quota?.persisted === true ? " · protected" : ""}
            {quota?.persisted === false && platform.isIOS
              ? " · may be cleared by iOS"
              : ""}
          </span>
        </div>
        {usagePct !== null && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
        {isReconciling && (
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Checking downloads…
          </p>
        )}
      </div>

      {/* Active queue */}
      {active.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              Downloading {active.findIndex((t) => t.status === "downloading") + 1}/
              {active.length}
            </h2>
            <Button
              size="sm"
              variant="outline"
              disabled={draining}
              onClick={() => void handleDrainAll()}
            >
              {draining ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Download all
            </Button>
          </div>
          {platform.isIOS && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Keep this tab open until downloads finish — iOS stops them in
              the background.
            </p>
          )}
          <div className="space-y-2">
            {queue
              .concat(active.filter((t) => !queue.includes(t)))
              .map((track) => (
                <TrackRow
                  key={track.songId}
                  track={track}
                  onRetry={handleRetry}
                  onRemove={handleRemove}
                  onPlay={handlePlayOffline}
                  retrying={retryingId === track.songId}
                />
              ))}
          </div>
        </section>
      )}

      {/* Attention */}
      {attention.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold mb-3">Needs attention</h2>
          <div className="space-y-2">
            {attention.map((track) => (
              <TrackRow
                key={track.songId}
                track={track}
                onRetry={handleRetry}
                onRemove={handleRemove}
                onPlay={handlePlayOffline}
                retrying={retryingId === track.songId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Downloaded */}
      <section>
        <h2 className="font-semibold mb-3">
          Downloaded{completed.length > 0 ? ` (${completed.length})` : ""}
        </h2>
        {completed.length === 0 ? (
          <div
            className={cn(
              "rounded-xl border border-dashed border-border p-8 text-center",
              active.length === 0 && attention.length === 0 && "mt-2",
            )}
          >
            <Download className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">No offline songs yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the download icon on any song
              {platform.isIOS ? " while this tab stays open" : ""} to save it
              for offline listening.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {completed.map((track) => (
              <TrackRow
                key={track.songId}
                track={track}
                onRetry={handleRetry}
                onRemove={handleRemove}
                onPlay={handlePlayOffline}
                retrying={retryingId === track.songId}
              />
            ))}
          </div>
        )}
      </section>

      {platform.isIOS && (
        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1">
          <Crown className="w-3.5 h-3.5" />
          iOS may clear cached songs when storage runs low — reopen the app
          occasionally to keep them.
        </p>
      )}
    </div>
  );
}
