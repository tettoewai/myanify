import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * POST /api/push-tokens — Register a push token.
 * Body: { token: string, platform?: string, deviceName?: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = (session as { user?: { id?: string } })?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token, platform, deviceName } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    await prisma.pushToken.upsert({
      where: { userId_token: { userId, token } },
      update: { isActive: true, platform: platform || "ANDROID", deviceName },
      create: { userId, token, platform: platform || "ANDROID", deviceName },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error registering push token:", error);
    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/push-tokens — Unregister push token(s).
 * Body: { token?: string } — if token omitted, deactivates all tokens for the user.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const userId = (session as { user?: { id?: string } })?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (token && typeof token === "string") {
      await prisma.pushToken.deleteMany({
        where: { userId, token },
      });
    } else {
      await prisma.pushToken.deleteMany({
        where: { userId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing push token:", error);
    return NextResponse.json(
      { error: "Failed to remove push token" },
      { status: 500 },
    );
  }
}
