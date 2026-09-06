"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import { swrFetcher } from "./api-client";
import type { MobileReleaseManifest } from "./mobile-release";

export const APP_RELEASE_REPO_FALLBACK = "tettoewai/myanify-releases";
export const APP_BANNER_DISMISS_KEY = "myanify-app-banner-dismissed";
/** Stable download URL — server resolves to the latest GitHub release APK. */
export const APP_DOWNLOAD_URL = "/api/app-download";

export function isAndroidDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua);
}

/** Show the native-app upsell only on Android web (not in the native app). */
export function useIsAndroidWeb(): boolean {
  const [isAndroid, setIsAndroid] = useState(false);
  useEffect(() => {
    setIsAndroid(isAndroidDevice());
  }, []);
  return isAndroid;
}

export function getRepoFromApkUrl(apkUrl?: string): string {
  if (!apkUrl) return APP_RELEASE_REPO_FALLBACK;
  try {
    const u = new URL(apkUrl);
    // https://github.com/<owner>/<repo>/releases/download/...
    const parts = u.pathname.split("/").filter(Boolean);
    if (u.hostname === "github.com" && parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  } catch {
    // fall through
  }
  return APP_RELEASE_REPO_FALLBACK;
}

export function getReleasesPageUrl(apkUrl?: string): string {
  return `https://github.com/${getRepoFromApkUrl(apkUrl)}/releases/latest`;
}

export function formatApkSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export interface AppRelease {
  manifest: MobileReleaseManifest | null;
  isLoading: boolean;
  isError: unknown;
  mutate: () => void;
}

/**
 * Latest Android release — source of truth is GET /api/mobile-update,
 * whose apkUrl always points at a GitHub Release asset
 * (see lib/mobile-release.ts allowlist). Downloads go through
 * /api/app-download which 302-redirects to that APK (or, if the
 * manifest is unavailable, straight to the GitHub latest release).
 */
export function useAppRelease(): AppRelease {
  const { data, error, isLoading, mutate } = useSWR<MobileReleaseManifest>(
    `${APP_DOWNLOAD_URL}?format=json`,
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );
  return {
    manifest: data?.version ? data : null,
    isLoading,
    isError: error,
    mutate,
  };
}
