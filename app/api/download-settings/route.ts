import { NextResponse } from "next/server";
import {
  DEFAULT_DOWNLOAD_SETTINGS,
  getDownloadSettings,
} from "@/lib/download-settings";

/**
 * GET /api/download-settings
 * Public (no auth) — mobile clients fetch this to learn the current
 * max-songs cap and whether VIP is required for downloads.
 */
export async function GET() {
  try {
    const settings = await getDownloadSettings();
    return NextResponse.json(
      { ...settings },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    console.error("Error fetching download settings:", error);
    return NextResponse.json({ ...DEFAULT_DOWNLOAD_SETTINGS });
  }
}
