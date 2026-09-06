import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/db";
import {
  getReleaseRepo,
  validateManifest,
  type MobileReleaseManifest,
} from "@/lib/mobile-release";

/**
 * GET /api/app-download
 *
 * Stable download entry for the Myanify Android app on web.
 * Always resolves to the latest APK from the GitHub release repo:
 *
 *   1. Release manifest (DB → mobile-release.json seed), whose apkUrl is
 *      allowlisted to https://github.com/<RELEASE_REPO>/releases/download/…
 *   2. Live GitHub API fallback (repo/releases/latest → first .apk asset)
 *   3. Final fallback: redirect to the releases page itself.
 *
 * Query:
 *   ?format=json — return the manifest JSON instead of redirecting
 *                  (used by the web banner / settings download card).
 */

async function readFileFallback(): Promise<MobileReleaseManifest | null> {
  try {
    const file = await readFile(
      join(process.cwd(), "mobile-release.json"),
      "utf-8",
    );
    return validateManifest(JSON.parse(file));
  } catch {
    return null;
  }
}

async function readDbManifest(): Promise<MobileReleaseManifest | null> {
  try {
    const row = await prisma.mobileRelease.findFirst({
      where: { isActive: true },
      orderBy: { versionCode: "desc" },
    });
    if (!row) return null;
    return validateManifest({
      version: row.version,
      versionCode: row.versionCode,
      apkUrl: row.apkUrl,
      notes: row.notes,
      mandatory: row.mandatory,
      sha256: row.sha256 ?? undefined,
      md5: row.md5 ?? undefined,
      fileSize: row.fileSize ?? undefined,
      minVersionCode: row.minVersionCode ?? undefined,
      rollout: row.rollout ?? undefined,
      certSha256: row.certSha256 ?? undefined,
      previousVersion: row.previousVersion ?? undefined,
      previousVersionCode: row.previousVersionCode ?? undefined,
      previousApkUrl: row.previousApkUrl ?? undefined,
      signature: row.signature ?? undefined,
    });
  } catch (e) {
    console.warn("[app-download] DB lookup failed, using file fallback:", e);
    return null;
  }
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size?: number;
}

interface GitHubRelease {
  tag_name: string;
  body?: string;
  assets?: GitHubAsset[];
  html_url?: string;
}

/** Live lookup against the GitHub release repo (no manifest needed). */
async function readGitHubLatest(
  repo: string,
): Promise<MobileReleaseManifest | null> {
  try {
    const token =
      process.env.RELEASE_GITHUB_TOKEN?.trim() ||
      process.env.GITHUB_TOKEN?.trim();
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "myanify-web",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const rel = (await res.json()) as GitHubRelease;
    const apk = rel.assets?.find((a) =>
      a.browser_download_url?.endsWith(".apk"),
    );
    if (!apk) return null;
    const version = (rel.tag_name || "").replace(/^v/, "") || rel.tag_name;
    return validateManifest({
      version,
      versionCode: 0,
      apkUrl: apk.browser_download_url,
      notes: rel.body ?? "",
      mandatory: false,
      fileSize: apk.size ?? undefined,
    });
  } catch (e) {
    console.warn("[app-download] GitHub latest lookup failed:", e);
    return null;
  }
}

async function resolveManifest(): Promise<{
  manifest: MobileReleaseManifest | null;
  repo: string;
}> {
  const repo = getReleaseRepo();
  const manifest =
    (await readDbManifest()) ??
    (await readFileFallback()) ??
    (await readGitHubLatest(repo));
  return { manifest, repo };
}

export async function GET(req: Request) {
  const { manifest, repo } = await resolveManifest();
  const url = new URL(req.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    req.headers.get("accept")?.includes("application/json");

  if (manifest) {
    if (wantsJson) {
      return NextResponse.json(manifest, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }
    return NextResponse.redirect(manifest.apkUrl, { status: 302 });
  }

  // Nothing resolvable — send the user to the releases page.
  const releasesPage = `https://github.com/${repo}/releases/latest`;
  if (wantsJson) {
    return NextResponse.json(
      { error: "No Android release available yet", repo, releasesPage },
      { status: 404 },
    );
  }
  return NextResponse.redirect(releasesPage, { status: 302 });
}
