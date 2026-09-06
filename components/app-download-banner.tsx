"use client";

import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APP_BANNER_DISMISS_KEY,
  APP_DOWNLOAD_URL,
  formatApkSize,
  useAppRelease,
  useIsAndroidWeb,
} from "@/lib/app-release";

function useDismissed(version?: string): [boolean, () => void] {
  const [stored, setStored] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(APP_BANNER_DISMISS_KEY);
    } catch {
      return null;
    }
  });
  const dismiss = () => {
    const v = version ?? "1";
    setStored(v);
    try {
      window.localStorage.setItem(APP_BANNER_DISMISS_KEY, v);
    } catch {
      // ignore
    }
  };
  // Per-version dismissal: a new release (different version) re-shows the banner.
  // While the version is still loading, honor any prior dismissal to avoid flash.
  const dismissed = version ? stored === version : stored !== null;
  return [dismissed, dismiss];
}

/**
 * App download banner — Android web only.
 * Promotes the native APK (latest GitHub release via /api/app-download).
 */
export function AppDownloadBanner() {
  const isAndroid = useIsAndroidWeb();
  const { manifest } = useAppRelease();
  const [dismissed, dismiss] = useDismissed(manifest?.version);

  if (!isAndroid || dismissed) return null;

  const size = formatApkSize(manifest?.fileSize);

  return (
    <div
      role="region"
      aria-label="Download the Myanify Android app"
      className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <Smartphone className="h-5 w-5 text-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          Get the Myanify app
          {manifest?.version ? ` · v${manifest.version}` : ""}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {size
            ? `Faster listening, offline mode · ${size}`
            : "Faster listening with offline mode"}
        </span>
      </span>
      <Button
        asChild
        size="sm"
        className="shrink-0 gap-1.5 rounded-full bg-primary hover:bg-primary/90"
      >
        <a href={APP_DOWNLOAD_URL} download>
          <Download className="h-4 w-4" />
          Download
        </a>
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss app download banner"
        className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
