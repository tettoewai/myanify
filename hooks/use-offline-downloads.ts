"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  offlineStorage,
  type OfflineTrack,
  type QuotaInfo,
  type QueueTrackInput,
  type ServerDownloadStatus,
} from "@/lib/offline-storage";
import {
  getOfflinePlatformInfo,
  registerDownloadSync,
  type OfflinePlatformInfo,
} from "@/lib/offline-platform";

interface UseOfflineDownloadsResult {
  platform: OfflinePlatformInfo;
  tracks: OfflineTrack[];
  queue: OfflineTrack[];
  quota: QuotaInfo | null;
  persisted: boolean | null;
  isSupported: boolean;
  isReconciling: boolean;
  queueTrack: (input: QueueTrackInput) => Promise<OfflineTrack | null>;
  downloadNext: (onProgress?: (songId: string, progress: number) => void) => Promise<boolean>;
  remove: (songId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

interface ServerDownloadsResponse {
  downloads?: Array<{ songId: string; downloadStatus: ServerDownloadStatus }>;
}

/**
 * Client hook for the v2 offline store.
 * - Loads local tracks + quota on mount
 * - Requests persistence (best-effort on iOS)
 * - Reconciles against `/api/vip/downloads` server truth
 * - Drains the queue sequentially (foreground-only; iOS has no Background Sync)
 */
export function useOfflineDownloads(): UseOfflineDownloadsResult {
  // NOTE: platform + support are resolved post-mount on purpose — reading
  // `window` during render would make SSR HTML differ from hydration output.
  const [platform, setPlatform] = useState<OfflinePlatformInfo>(() => ({
    platform: "other",
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
    supportsBackgroundSync: false,
    canBackgroundDownload: false,
  }));
  const [tracks, setTracks] = useState<OfflineTrack[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const drainingRef = useRef(false);

  useEffect(() => {
    setPlatform(getOfflinePlatformInfo());
    setIsSupported(
      typeof window !== "undefined" && "indexedDB" in window,
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupported) return;
    const [all, q] = await Promise.all([
      offlineStorage.getAllDownloads(),
      offlineStorage.getQuota(),
    ]);
    setTracks(all);
    setQuota(q);
  }, [isSupported]);

  // Initial load: persistence request + server reconcile.
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;
    (async () => {
      setIsReconciling(true);
      try {
        const persisted = await offlineStorage.requestPersistence();
        if (!cancelled && persisted !== null) {
          setQuota((prev) => ({ ...(prev ?? { usage: null, quota: null }), persisted }));
        }
        try {
          const res = await fetch("/api/vip/downloads");
          if (res.ok) {
            const data = (await res.json()) as ServerDownloadsResponse;
            const statuses = (data.downloads ?? []).map((d) => ({
              songId: d.songId,
              status: d.downloadStatus,
            }));
            await offlineStorage.reconcileWithServer(statuses);
          }
        } catch {
          // Offline — local state is still usable.
        }
        if (!cancelled) await refresh();
      } finally {
        if (!cancelled) setIsReconciling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSupported, refresh]);

  // Poll IndexedDB while anything is active so progress bars (floating
  // pill, Downloads page, per-song buttons) update live. Idle otherwise.
  const hasActive = tracks.some(
    (t) => t.status === "queued" || t.status === "downloading",
  );
  useEffect(() => {
    if (!isSupported || !hasActive) return;
    const id = setInterval(() => {
      void refresh();
    }, 1500);
    return () => clearInterval(id);
  }, [isSupported, hasActive, refresh]);

  // Reconcile when tab becomes visible again (catches iOS eviction).
  useEffect(() => {
    if (!isSupported) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isSupported, refresh]);

  const queueTrack = useCallback(
    async (input: QueueTrackInput) => {
      if (!isSupported) return null;
      const track = await offlineStorage.queueTrack(input);
      // Android only — no-op on iOS/desktop without SyncManager.
      await registerDownloadSync();
      await refresh();
      return track;
    },
    [isSupported, refresh],
  );

  /** Download the next queued track. Returns true if work was done. */
  const downloadNext = useCallback(
    async (onProgress?: (songId: string, progress: number) => void) => {
      if (!isSupported || drainingRef.current) return false;
      const queue = await offlineStorage.getQueue();
      const next = queue[0];
      if (!next) return false;
      drainingRef.current = true;
      try {
        await offlineStorage.downloadAudio(
          next.songId,
          next.playbackUrl,
          (p) => onProgress?.(next.songId, p),
          undefined,
          {
            title: next.title,
            artistName: next.artistName,
            coverUrl: next.coverUrl,
            durationSec: next.durationSec,
            mimeType: next.mimeType,
            expiresAt: next.expiresAt,
          },
        );
      } finally {
        drainingRef.current = false;
        await refresh();
      }
      return true;
    },
    [isSupported, refresh],
  );

  const remove = useCallback(
    async (songId: string) => {
      if (!isSupported) return;
      await offlineStorage.deleteDownload(songId);
      await refresh();
    },
    [isSupported, refresh],
  );

  // Background Sync wake-up (Android): SW posts OFFLINE_DRAIN_QUEUE.
  const downloadNextRef = useRef(downloadNext);
  downloadNextRef.current = downloadNext;
  useEffect(() => {
    if (!isSupported || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown } | null;
      if (data?.type !== "OFFLINE_DRAIN_QUEUE") return;
      (async () => {
        // Drain sequentially until the queue is empty.
        for (;;) {
          const worked = await downloadNextRef.current();
          if (!worked) break;
        }
      })();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [isSupported]);

  const queue = useMemo(
    () => tracks.filter((t) => t.status === "queued" || t.status === "downloading"),
    [tracks],
  );

  return {
    platform,
    tracks,
    queue,
    quota,
    persisted: quota?.persisted ?? null,
    isSupported,
    isReconciling,
    queueTrack,
    downloadNext,
    remove,
    refresh,
  };
}
