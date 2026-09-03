import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * GET /api/mobile-update
 *
 * Public, unauthenticated manifest describing the latest side-loadable
 * Android APK. Consumed by the Expo app's in-app self-update flow so users
 * without a Play Store account can download and install newer binaries.
 *
 * Source of truth: mobile-release.json (updated on each APK release).
 */
type ValidatedManifest = {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string;
  mandatory: boolean;
  sha256?: string;
  fileSize?: number;
};

function validateManifest(raw: unknown): ValidatedManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.version !== "string" || !m.version) return null;
  if (typeof m.versionCode !== "number" || !Number.isFinite(m.versionCode)) return null;
  if (typeof m.apkUrl !== "string" || !m.apkUrl) return null;
  // notes/mandatory/sha256/fileSize are optional but must be correct type if present
  if (m.notes !== undefined && typeof m.notes !== "string") return null;
  if (m.mandatory !== undefined && typeof m.mandatory !== "boolean") return null;
  if (m.sha256 !== undefined && typeof m.sha256 !== "string") return null;
  if (m.fileSize !== undefined && typeof m.fileSize !== "number") return null;
  if (m.apkUrl && !/^https:\/\//.test(m.apkUrl)) return null;
  return {
    version: m.version,
    versionCode: m.versionCode,
    apkUrl: m.apkUrl,
    notes: (m.notes as string) ?? "",
    mandatory: Boolean(m.mandatory),
    ...(typeof m.sha256 === "string" && m.sha256 ? { sha256: m.sha256 } : {}),
    ...(typeof m.fileSize === "number" && m.fileSize > 0 ? { fileSize: m.fileSize } : {}),
  };
}

export async function GET() {
  try {
    const file = await readFile(
      join(process.cwd(), "mobile-release.json"),
      "utf-8",
    );
    const raw = JSON.parse(file);
    const manifest = validateManifest(raw);

    if (!manifest) {
      console.error("Invalid mobile-release.json shape:", raw);
      return NextResponse.json(
        { error: "Update manifest invalid" },
        { status: 500 },
      );
    }

    // Short max-age ensures mandatory updates propagate quickly; s-maxage allows CDN to cache slightly longer with revalidation
    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Failed to read mobile-release.json:", error);
    return NextResponse.json(
      { error: "Update manifest unavailable" },
      { status: 500 },
    );
  }
}
