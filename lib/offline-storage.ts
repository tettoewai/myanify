/**
 * Web Offline Storage Manager
 *
 * Handles offline downloads for VIP users on web using IndexedDB.
 * Stores encrypted audio files for offline playback.
 */

const DB_NAME = "myanify_offline";
const DB_VERSION = 1;
const STORE_DOWNLOADS = "downloads";
const STORE_LICENSE = "license";

interface OfflineDownload {
  id: string;
  songId: string;
  audioData: ArrayBuffer;
  encrypted: boolean;
  progress: number;
  status: "pending" | "downloading" | "completed" | "failed";
  downloadedAt: number;
  expiresAt?: number;
  fileSize?: number;
  checksum?: string;
}

interface LicenseData {
  deviceId: string;
  licenseKey: string;
  lastValidated: number;
}

// Open IndexedDB database
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create downloads store
      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        const downloadStore = db.createObjectStore(STORE_DOWNLOADS, {
          keyPath: "songId",
        });
        downloadStore.createIndex("status", "status", { unique: false });
        downloadStore.createIndex("downloadedAt", "downloadedAt", {
          unique: false,
        });
      }

      // Create license store
      if (!db.objectStoreNames.contains(STORE_LICENSE)) {
        db.createObjectStore(STORE_LICENSE, { keyPath: "id" });
      }
    };
  });
}

// Offline storage manager
export class WebOfflineStorage {
  private db: IDBDatabase | null = null;
  private activeBlobUrl: string | null = null;

  async initialize(): Promise<void> {
    if (!this.db) {
      this.db = await openDB();
    }
  }

  // License management
  async getLicense(): Promise<LicenseData | null> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_LICENSE], "readonly");
      const store = transaction.objectStore(STORE_LICENSE);
      const request = store.get("current");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveLicense(license: LicenseData): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_LICENSE], "readwrite");
      const store = transaction.objectStore(STORE_LICENSE);
      const request = store.put({ ...license, id: "current" });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getDeviceId(): Promise<string> {
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
  async getDownload(songId: string): Promise<OfflineDownload | null> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOWNLOADS], "readonly");
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.get(songId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllDownloads(): Promise<OfflineDownload[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOWNLOADS], "readonly");
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async saveDownload(download: OfflineDownload): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOWNLOADS], "readwrite");
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.put(download);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteDownload(songId: string): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOWNLOADS], "readwrite");
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.delete(songId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Download audio file
  async downloadAudio(
    songId: string,
    audioUrl: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer> {
    // Create download record
    const download: OfflineDownload = {
      id: songId,
      songId,
      audioData: new ArrayBuffer(0),
      encrypted: false,
      progress: 0,
      status: "downloading",
      downloadedAt: Date.now(),
    };
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        const progress = contentLength
          ? Math.round((receivedLength / contentLength) * 100)
          : 0;

        download.progress = progress;
        if (progress - lastSavedProgress >= 5 || progress === 100) {
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
      download.audioData = audioData.buffer;
      download.status = "completed";
      download.progress = 100;
      download.fileSize = audioData.length;
      await this.saveDownload(download);

      return audioData.buffer;
    } catch (error) {
      // Update download status to failed
      download.status = "failed";
      await this.saveDownload(download);
      throw error;
    }
  }

  // Get audio URL from stored download (for playback)
  async getAudioUrl(songId: string): Promise<string | null> {
    const download = await this.getDownload(songId);

    if (!download || download.status !== "completed") {
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

    const blob = new Blob([download.audioData], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    this.activeBlobUrl = url;
    return url;
  }

  // Clean up expired downloads
  async cleanupExpiredDownloads(): Promise<void> {
    const downloads = await this.getAllDownloads();
    const now = Date.now();

    for (const download of downloads) {
      if (download.expiresAt && download.expiresAt < now) {
        await this.deleteDownload(download.songId);
      }
    }
  }

  // Get storage usage estimate
  async getStorageUsage(): Promise<number> {
    const downloads = await this.getAllDownloads();
    return downloads.reduce(
      (total, download) => total + (download.fileSize || 0),
      0,
    );
  }
}

// Singleton instance
export const offlineStorage = new WebOfflineStorage();
