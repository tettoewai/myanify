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
export async function GET() {
  try {
    const file = await readFile(
      join(process.cwd(), "mobile-release.json"),
      "utf-8",
    );
    const manifest = JSON.parse(file);

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
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
