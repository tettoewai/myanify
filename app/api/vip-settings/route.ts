import { NextResponse } from "next/server";
import { DEFAULT_VIP_SETTINGS, getVIPSettings } from "@/lib/vip-settings";

/**
 * GET /api/vip-settings
 * Public (no auth) — clients fetch this to learn whether VIP gating is
 * active. When enabled=false, everyone gets VIP features for free.
 */
export async function GET() {
  try {
    const settings = await getVIPSettings();
    return NextResponse.json(
      { ...settings },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  } catch (error) {
    console.error("Error fetching VIP settings:", error);
    return NextResponse.json({ ...DEFAULT_VIP_SETTINGS });
  }
}
