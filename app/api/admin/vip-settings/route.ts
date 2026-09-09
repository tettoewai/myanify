import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { getVIPSettings, updateVIPSettings } from "@/lib/vip-settings";

function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  return !!session?.user && session.user.role === "ADMIN";
}

/**
 * GET /api/admin/vip-settings
 * Admin-only read of the global VIP toggle.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const settings = await getVIPSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching admin VIP settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch VIP settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/vip-settings
 * Body: { enabled?: boolean }
 * When enabled=false, everyone gets VIP features for free.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { enabled } = body ?? {};

    if (enabled !== undefined && typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 },
      );
    }

    const settings = await updateVIPSettings(
      { ...(enabled !== undefined ? { enabled } : {}) },
      session!.user.id,
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating admin VIP settings:", error);
    return NextResponse.json(
      { error: "Failed to update VIP settings" },
      { status: 500 },
    );
  }
}
