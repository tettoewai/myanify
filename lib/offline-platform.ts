/**
 * Offline platform detection + queue helpers.
 *
 * Android Chrome: Background Sync available, persistence reliably granted
 * when installed — behaves close to a download manager.
 * iOS Safari: no Background Sync, persistence best-effort — foreground-only
 * queue with "keep this tab open" copy.
 */

export type OfflinePlatform = "android" | "ios" | "other";

export interface OfflinePlatformInfo {
  platform: OfflinePlatform;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  supportsBackgroundSync: boolean;
  /** True when downloads can continue after backgrounding. */
  canBackgroundDownload: boolean;
}

export function getOfflinePlatformInfo(): OfflinePlatformInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      platform: "other",
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      supportsBackgroundSync: false,
      canBackgroundDownload: false,
    };
  }

  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      typeof window !== "undefined" &&
      "ontouchend" in window &&
      navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const supportsBackgroundSync =
    "serviceWorker" in navigator && "SyncManager" in window;

  return {
    platform: isIOS ? "ios" : isAndroid ? "android" : "other",
    isIOS,
    isAndroid,
    isStandalone,
    supportsBackgroundSync,
    canBackgroundDownload: supportsBackgroundSync && !isIOS,
  };
}

export const OFFLINE_COPY: Record<OfflinePlatform, string> = {
  android: "Downloaded for offline listening",
  ios: "Cached for offline — keep the app open while downloading. iOS may clear cached songs.",
  other: "Saved for offline listening",
};

/** Register a Background Sync tag (Android Chrome only — no-op elsewhere). */
export async function registerDownloadSync(
  tag = "download-queue",
): Promise<boolean> {
  try {
    const info = getOfflinePlatformInfo();
    if (!info.supportsBackgroundSync) return false;
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const syncReg = reg as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (!syncReg.sync) return false;
    await syncReg.sync.register(tag);
    return true;
  } catch {
    return false;
  }
}
