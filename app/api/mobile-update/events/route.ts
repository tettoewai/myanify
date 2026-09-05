import { NextResponse } from "next/server";
import { prisma } from "@/db";

const ALLOWED = new Set([
  "check",
  "available",
  "download_start",
  "download_complete",
  "download_error",
  "install_prompt",
  "install_dismiss",
]);

/**
 * POST /api/mobile-update/events
 * Public, unauthenticated telemetry for update adoption.
 * Body: { event, currentVersionCode?, latestVersionCode?, error? }
 * Best-effort: never fails the client (returns ok:true even if DB is down).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = typeof body.event === "string" ? body.event : "";
  if (!ALLOWED.has(event)) {
    return NextResponse.json({ ok: false, error: "bad event" }, { status: 400 });
  }
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
  try {
    await prisma.mobileUpdateEvent.create({
      data: {
        event,
        platform: "android",
        currentVersionCode: num(body.currentVersionCode),
        latestVersionCode: num(body.latestVersionCode),
        error:
          typeof body.error === "string" ? body.error.slice(0, 1000) : null,
      },
    });
  } catch (e) {
    console.warn("[mobile-update/events] write failed:", e);
  }
  return NextResponse.json({ ok: true });
}
