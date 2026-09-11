/**
 * Web Offline Storage Manager (v2)
 *
 * IndexedDB owns audio blobs for VIP offline playback.
 * The service worker intentionally does NOT cache `/api/audio/stream`
 * (Range requests + Serwist CacheFirst don't mix) — see `app/sw.ts`.
 *
 * Schema:
 * - `downloads` (keyPath: songId): OfflineTrack + audioData blob
 * - `license`   (keyPath: id): device license
 * - `meta`      (keyPath: key): persistence flag, reconcile stamp, queue order
 */

const DB_NAME = "myanify_offline";
const DB_VERSION = 2;
const STORE_DOWNLOADS = "downloads";
const STORE_LICENSE = "license";
const STORE_META = "meta";

export type LocalStatus =
  | "queued"
  | "downloading"
  | "completed"
  | "failed"
  | "evicted"
  | "expired"
  | "cancelled";

/** Server-side statuses from Prisma `DownloadStatus` (subset we reconcile). */
export type ServerDownloadStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface OfflineTrackMeta {
  title: string;
  artistName: string;
  coverUrl: string | null;
  durationSec: number | null;
}

export interface OfflineTrack extends OfflineTrackMeta {
  songId: string;
  /** Legacy alias — always equals songId. Kept for v1 compat. */
  id: string;
  status: LocalStatus;
  progress: number; // 0-100
  bytesReceived: number;
  totalBytes: number | null;

  /** Stable fetch key (`/api/audio/stream?url=...`), not the raw CDN URL. */
  playbackUrl: string;
  mimeType: string;

  queuedAt: number;
  startedAt: number | null;
  completedAt: number | null;
  /** Legacy alias for completedAt. Kept for v1 compat. */
  downloadedAt: number;
  updatedAt: number;
  expiresAt: number | null;

  fileSize: number | null;
  checksum: string | null;
  /** Legacy v1 field — audio was never encrypted client-side. Always false. */
  encrypted: boolean;
  error: string | null;
  attempts: number;
  audioData: ArrayBuffer | null; // null while queued/failed/evicted/expired
}

/** Back-compat alias for v1 callers. */
export type OfflineDownload = OfflineTrack;

export interface QueueTrackInput extends OfflineTrackMeta {
  songId: string;
  playbackUrl: string;
  mimeType?: string;
  expiresAt?: number | null;
}

interface LicenseData {
  deviceId: string;
  licenseKey: string;
  lastValidated: number;
}

interface MetaRecord {
  key: string;
  [k: string]: unknown;
}

export interface QuotaInfo {
  usage: number | null;
  quota: number | null;
  persisted: boolean | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function ensureBrowser(): void {
  if (!isBrowser()) {
    throw new Error("Offline storage is only available in the browser");
  }
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string,
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, { unique: false });
  }
}

// Open IndexedDB database (v1 -> v2 migration handled here)
function openDB(): Promise<IDBDatabase> {
  ensureBrowser();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction;
      const oldVersion = event.oldVersion;

      // Downloads store — created in v1 with keyPath songId
      let downloadStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        downloadStore = db.createObjectStore(STORE_DOWNLOADS, {
          keyPath: "songId",
        });
        downloadStore.createIndex("status", "status", { unique: false });
        downloadStore.createIndex("downloadedAt", "downloadedAt", {
          unique: false,
        });
      } else if (tx) {
        downloadStore = tx.objectStore(STORE_DOWNLOADS);
      } else {
        // Fallback — should not happen during upgradeneeded
        downloadStore = db
          .transaction([STORE_DOWNLOADS], "readwrite")
          .objectStore(STORE_DOWNLOADS);
      }

      if (oldVersion < 2) {
        // v2 additions: updatedAt + expiresAt indexes for reconcile/sort.
        ensureIndex(downloadStore, "updatedAt", "updatedAt");
        ensureIndex(downloadStore, "expiresAt", "expiresAt");
        // Existing v1 rows are backfilled lazily in `normalizeTrack()`
        // on read — no cursor walk needed inside the upgrade transaction.
      }

      if (!db.objectStoreNames.contains(STORE_LICENSE)) {
        db.createObjectStore(STORE_LICENSE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const transaction = db.transaction([storeName], mode);
  const store = transaction.objectStore(storeName);
  const result = await fn(store);
  return result instanceof IDBRequest ? requestToPromise(result) : result;
}

/** Fill v2 defaults for rows written by v1 clients. */
function normalizeTrack(raw: Record<string, unknown>): OfflineTrack {
  const now = Date.now();
  const songId = String(raw.songId ?? raw.id ?? "");
  const legacyStatus = String(raw.status ?? "queued");
  const status: LocalStatus =
    legacyStatus === "pending"
      ? "queued"
      : (["queued", "downloading", "completed", "failed", "evicted", "expired", "cancelled"] as LocalStatus[]).includes(
          legacyStatus as LocalStatus,
        )
        ? (legacyStatus as LocalStatus)
        : "queued";

  return {
    songId,
    id: String(raw.id ?? songId),
    status,
    progress: typeof raw.progress === "number" ? raw.progress : 0,
    bytesReceived:
      typeof raw.bytesReceived === "number" ? raw.bytesReceived : 0,
    totalBytes:
      typeof raw.totalBytes === "number"
        ? (raw.totalBytes as number)
        : typeof raw.fileSize === "number"
          ? (raw.fileSize as number)
          : null,
    playbackUrl: typeof raw.playbackUrl === "string" ? raw.playbackUrl : "",
    mimeType:
      typeof raw.mimeType === "string" ? raw.mimeType : "audio/mpeg",
    title: typeof raw.title === "string" ? raw.title : "",
    artistName: typeof raw.artistName === "string" ? raw.artistName : "",
    coverUrl:
      typeof raw.coverUrl === "string" ? (raw.coverUrl as string) : null,
    durationSec:
      typeof raw.durationSec === "number"
        ? (raw.durationSec as number)
        : null,
    queuedAt: typeof raw.queuedAt === "number" ? raw.queuedAt : now,
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : null,
    completedAt:
      typeof raw.completedAt === "number"
        ? raw.completedAt
        : typeof raw.downloadedAt === "number"
          ? (raw.downloadedAt as number)
          : null,
    downloadedAt:
      typeof raw.downloadedAt === "number"
        ? (raw.downloadedAt as number)
        : typeof raw.completedAt === "number"
          ? (raw.completedAt as number)
          : now,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
    expiresAt: typeof raw.expiresAt === "number" ? raw.expiresAt : null,
    fileSize: typeof raw.fileSize === "number" ? raw.fileSize : null,
    checksum: typeof raw.checksum === "string" ? raw.checksum : null,
    encrypted: false,
    error: typeof raw.error === "string" ? raw.error : null,
    attempts: typeof raw.attempts === "number" ? raw.attempts : 0,
    audioData: raw.audioData instanceof ArrayBuffer ? raw.audioData : null,
  };
}

// Offline storage manager
export class WebOfflineStorage {
  private db: IDBDatabase | null = null;
  private activeBlobUrl: string | null = null;
  /**
   * Per-song blob URLs for playback. Unlike `activeBlobUrl` (single-slot,
   * used by the downloads preview), these coexist so the main element and
   * the preload element can each hold a blob URL during gapless swaps
   * without revoking the currently-playing track.
   */
  private playbackBlobUrls = new Map<string, string>();

  async initialize(): Promise<void> {
    if (!isBrowser()) return;
    if (!this.db) {
      this.db = await openDB();
    }
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!isBrowser()) return null;
    await this.initialize();
    return this.db;
  }

  // License management
  async getLicense(): Promise<LicenseData | null> {
    const db = await this.getDB();
    if (!db) return null;
    const result = await withStore(db, STORE_LICENSE, "readonly", (store) =>
      store.get("current"),
    );
    return (result as LicenseData) || null;
  }

  async saveLicense(license: LicenseData): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    await withStore(db, STORE_LICENSE, "readwrite", (store) =>
      store.put({ ...license, id: "current" }),
    );
  }

  async getDeviceId(): Promise<string> {
    ensureBrowser();
    let deviceId = localStorage.getItem("myanify_device_id");

    if (!deviceId) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      deviceId = Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      localStorage.setItem("myanify_device_id", deviceId);
    }

    return deviceId;
  }

  // Download management
  async getDownload(songId: string): Promise<OfflineTrack | null> {
    const db = await this.getDB();
    if (!db) return null;
    const result = await withStore(db, STORE_DOWNLOADS, "readonly", (store) =>
      store.get(songId),
    );
    return result ? normalizeTrack(result as Record<string, unknown>) : null;
  }

  async getAllDownloads(): Promise<OfflineTrack[]> {
    const db = await this.getDB();
    if (!db) return [];
    const results = await withStore(db, STORE_DOWNLOADS, "readonly", (store) =>
      store.getAll(),
    );
    return ((results as Record<string, unknown>[]) || []).map(normalizeTrack);
  }

  async saveDownload(download: OfflineTrack): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    const normalized: OfflineTrack = {
      ...normalizeTrack(download as unknown as Record<string, unknown>),
      id: download.songId,
      updatedAt: Date.now(),
    };
    await withStore(db, STORE_DOWNLOADS, "readwrite", (store) =>
      store.put(normalized),
    );
  }

  async deleteDownload(songId: string): Promise<void> {
    this.releasePlaybackBlobUrl(songId);
    const db = await this.getDB();
    if (!db) return;
    await withStore(db, STORE_DOWNLOADS, "readwrite", (store) =>
      store.delete(songId),
    );
    await this.removeFromQueueOrder(songId);
  }

  /** Enqueue a track without downloading yet (foreground queue on iOS). */
  async queueTrack(input: QueueTrackInput): Promise<OfflineTrack> {
    const existing = await this.getDownload(input.songId);
    const now = Date.now();
    if (existing && (existing.status === "completed" || existing.status === "downloading")) {
      return existing;
    }
    const track: OfflineTrack = normalizeTrack({
      ...existing,
      songId: input.songId,
      id: input.songId,
      status: "queued",
      progress: 0,
      bytesReceived: 0,
      playbackUrl: input.playbackUrl,
      mimeType: input.mimeType ?? existing?.mimeType ?? "audio/mpeg",
      title: input.title,
      artistName: input.artistName,
      coverUrl: input.coverUrl,
      durationSec: input.durationSec,
      queuedAt: existing?.queuedAt ?? now,
      expiresAt: input.expiresAt ?? existing?.expiresAt ?? null,
      audioData: existing?.status === "completed" ? existing.audioData : null,
      attempts: (existing?.attempts ?? 0) + 0,
      error: null,
      updatedAt: now,
    });
    await this.saveDownload(track);
    await this.appendToQueueOrder(input.songId);
    return track;
  }

  /** Queued + downloading tracks in FIFO queue order. */
  async getQueue(): Promise<OfflineTrack[]> {
    const [all, order] = await Promise.all([
      this.getAllDownloads(),
      this.getQueueOrder(),
    ]);
    const byId = new Map(all.map((t) => [t.songId, t]));
    const ordered: OfflineTrack[] = [];
    for (const id of order) {
      const t = byId.get(id);
      if (t && (t.status === "queued" || t.status === "downloading")) {
        ordered.push(t);
      }
    }
    // Include any queued/downloading rows missing from the order list.
    for (const t of all) {
      if (
        (t.status === "queued" || t.status === "downloading") &&
        !order.includes(t.songId)
      ) {
        ordered.push(t);
      }
    }
    return ordered.sort((a, b) => a.queuedAt - b.queuedAt);
  }

  async getQueueOrder(): Promise<string[]> {
    const db = await this.getDB();
    if (!db) return [];
    const result = await withStore(db, STORE_META, "readonly", (store) =>
      store.get("queue-order"),
    );
    const ids = (result as { songIds?: unknown } | undefined)?.songIds;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  }

  private async setQueueOrder(songIds: string[]): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    await withStore(db, STORE_META, "readwrite", (store) =>
      store.put({ key: "queue-order", songIds } satisfies MetaRecord),
    );
  }

  private async appendToQueueOrder(songId: string): Promise<void> {
    const order = await this.getQueueOrder();
    if (!order.includes(songId)) {
      await this.setQueueOrder([...order, songId]);
    }
  }

  private async removeFromQueueOrder(songId: string): Promise<void> {
    const order = await this.getQueueOrder();
    if (order.includes(songId)) {
      await this.setQueueOrder(order.filter((id) => id !== songId));
    }
  }

  // Download audio file with progress + metadata.
  async downloadAudio(
    songId: string,
    audioUrl: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
    meta?: Partial<OfflineTrackMeta> & { mimeType?: string; expiresAt?: number | null },
  ): Promise<ArrayBuffer> {
    ensureBrowser();
    const db = await this.getDB();
    if (!db) throw new Error("Offline storage unavailable");

    const now = Date.now();
    const previous = await this.getDownload(songId);
    let download: OfflineTrack = normalizeTrack({
      ...previous,
      songId,
      id: songId,
      status: "downloading",
      progress: 0,
      bytesReceived: 0,
      playbackUrl: audioUrl,
      mimeType: meta?.mimeType ?? previous?.mimeType ?? "audio/mpeg",
      title: meta?.title ?? previous?.title ?? "",
      artistName: meta?.artistName ?? previous?.artistName ?? "",
      coverUrl: meta?.coverUrl ?? previous?.coverUrl ?? null,
      durationSec: meta?.durationSec ?? previous?.durationSec ?? null,
      queuedAt: previous?.queuedAt ?? now,
      startedAt: now,
      expiresAt: meta?.expiresAt ?? previous?.expiresAt ?? null,
      audioData: null,
      error: null,
      attempts: (previous?.attempts ?? 0) + 1,
      updatedAt: now,
    });
    await this.saveDownload(download);

    try {
      const response = await fetch(audioUrl, { signal });
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const contentLength = parseInt(
        response.headers.get("content-length") || "0",
        10,
      );

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      let lastSavedProgress = 0;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        const progress = contentLength
          ? Math.round((receivedLength / contentLength) * 100)
          : 0;

        download.bytesReceived = receivedLength;
        download.totalBytes = contentLength || null;
        download.progress = progress;
        if (progress - lastSavedProgress >= 5 || progress === 100) {
          download.updatedAt = Date.now();
          await this.saveDownload(download);
          lastSavedProgress = progress;
        }

        if (onProgress) {
          onProgress(progress);
        }
      }

      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let position = 0;
      for (const chunk of chunks) {
        audioData.set(chunk, position);
        position += chunk.length;
      }

      // Save completed download
      const completedAt = Date.now();
      download = {
        ...download,
        audioData: audioData.buffer as ArrayBuffer,
        status: "completed",
        progress: 100,
        completedAt,
        downloadedAt: completedAt,
        updatedAt: completedAt,
        fileSize: audioData.length,
      };
      await this.saveDownload(download);
      await this.removeFromQueueOrder(songId);

      return audioData.buffer as ArrayBuffer;
    } catch (error) {
      // Abort is user-initiated — back to queued so the UI can resume.
      const cancelled = error instanceof DOMException && error.name === "AbortError";
      download.status = cancelled ? "queued" : "failed";
      download.error = error instanceof Error ? error.message : "Download failed";
      download.updatedAt = Date.now();
      await this.saveDownload(download);
      throw error;
    }
  }

  // Get audio URL from stored download (for playback)
  async getAudioUrl(songId: string): Promise<string | null> {
    const download = await this.getDownload(songId);

    if (!download || download.status !== "completed" || !download.audioData) {
      return null;
    }

    // Check expiration
    if (download.expiresAt && download.expiresAt < Date.now()) {
      await this.deleteDownload(songId);
      return null;
    }

    // Revoke previous blob URL before creating a new one
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }

    const blob = new Blob([download.audioData], { type: download.mimeType || "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    this.activeBlobUrl = url;
    return url;
  }

  /**
   * Offline-first resolver for the player (mirrors mobile
   * `resolvePlayableAudioUri`). Returns a cached per-song blob URL when the
   * track is downloaded, without revoking other songs' URLs, so the main
   * and preload `<audio>` elements can coexist during gapless swaps.
   * Returns null when there is no usable offline copy.
   */
  async getPlaybackBlobUrl(songId: string): Promise<string | null> {
    if (!isBrowser()) return null;
    const cached = this.playbackBlobUrls.get(songId);
    if (cached) return cached;
    const download = await this.getDownload(songId);
    if (!download || download.status !== "completed" || !download.audioData) {
      return null;
    }
    if (download.expiresAt && download.expiresAt < Date.now()) {
      await this.deleteDownload(songId);
      return null;
    }
    const blob = new Blob([download.audioData], {
      type: download.mimeType || "audio/mpeg",
    });
    const url = URL.createObjectURL(blob);
    this.playbackBlobUrls.set(songId, url);
    return url;
  }

  /** Revoke a cached playback blob URL (e.g. after eviction/delete). */
  releasePlaybackBlobUrl(songId: string): void {
    if (!isBrowser()) return;
    const url = this.playbackBlobUrls.get(songId);
    if (url) {
      URL.revokeObjectURL(url);
      this.playbackBlobUrls.delete(songId);
    }
  }

  /**
   * Reconcile local rows against server truth.
   * - server EXPIRED/CANCELLED -> local expired/cancelled + drop blob
   * - completed rows with missing/empty blob -> evicted (iOS cleared it)
   * Never deletes evicted rows — UI shows "Tap to re-download".
   */
  async reconcileWithServer(
    serverStatuses: Array<{ songId: string; status: ServerDownloadStatus }>,
  ): Promise<{ expired: number; evicted: number; checkedAt: number }> {
    const db = await this.getDB();
    const checkedAt = Date.now();
    if (!db) return { expired: 0, evicted: 0, checkedAt };

    const serverById = new Map(serverStatuses.map((s) => [s.songId, s.status]));
    const local = await this.getAllDownloads();
    let expired = 0;
    let evicted = 0;

    for (const track of local) {
      const serverStatus = serverById.get(track.songId);
      if (serverStatus === "EXPIRED") {
        if (track.status !== "expired") {
          await this.saveDownload({
            ...track,
            status: "expired",
            audioData: null,
            progress: 0,
            updatedAt: checkedAt,
          });
          expired++;
        }
        continue;
      }
      if (serverStatus === "CANCELLED") {
        if (track.status !== "cancelled") {
          await this.saveDownload({
            ...track,
            status: "cancelled",
            audioData: null,
            updatedAt: checkedAt,
          });
        }
        continue;
      }
      // Local expiry (VIP lapse pushed via expiresAt)
      if (track.expiresAt && track.expiresAt < checkedAt && track.status === "completed") {
        await this.saveDownload({ ...track, status: "expired", audioData: null, updatedAt: checkedAt });
        expired++;
        continue;
      }
      // Eviction detection: row says completed but blob is gone.
      if (
        track.status === "completed" &&
        (!track.audioData || track.audioData.byteLength === 0)
      ) {
        await this.saveDownload({ ...track, status: "evicted", updatedAt: checkedAt });
        evicted++;
      }
    }

    await withStore(db, STORE_META, "readwrite", (store) =>
      store.put({ key: "last-reconciled", at: checkedAt } satisfies MetaRecord),
    );
    return { expired, evicted, checkedAt };
  }

  async getLastReconciledAt(): Promise<number | null> {
    const db = await this.getDB();
    if (!db) return null;
    const result = await withStore(db, STORE_META, "readonly", (store) =>
      store.get("last-reconciled"),
    );
    const at = (result as { at?: unknown } | undefined)?.at;
    return typeof at === "number" ? at : null;
  }

  /** Best-effort persistence request — reliably granted on Android, flaky on iOS. */
  async requestPersistence(): Promise<boolean | null> {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) {
      return null;
    }
    try {
      const granted = await navigator.storage.persist();
      const db = await this.getDB();
      if (db) {
        await withStore(db, STORE_META, "readwrite", (store) =>
          store.put({
            key: "storage-persisted",
            granted,
            checkedAt: Date.now(),
          } satisfies MetaRecord),
        );
      }
      return granted;
    } catch {
      return null;
    }
  }

  async getQuota(): Promise<QuotaInfo> {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      return { usage: null, quota: null, persisted: null };
    }
    try {
      const [{ usage, quota }, persisted] = await Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(null),
      ]);
      return {
        usage: typeof usage === "number" ? usage : null,
        quota: typeof quota === "number" ? quota : null,
        persisted: typeof persisted === "boolean" ? persisted : null,
      };
    } catch {
      return { usage: null, quota: null, persisted: null };
    }
  }

  // Clean up expired downloads
  async cleanupExpiredDownloads(): Promise<void> {
    const downloads = await this.getAllDownloads();
    const now = Date.now();

    for (const download of downloads) {
      if (
        (download.expiresAt && download.expiresAt < now) ||
        download.status === "expired"
      ) {
        await this.deleteDownload(download.songId);
      }
    }
  }

  // Sum of stored blob bytes (local estimate — use getQuota() for device truth).
  async getStorageUsage(): Promise<number> {
    const downloads = await this.getAllDownloads();
    return downloads.reduce(
      (total, download) =>
        total + (download.fileSize ?? download.audioData?.byteLength ?? 0),
      0,
    );
  }
}

// Singleton instance
export const offlineStorage = new WebOfflineStorage();
