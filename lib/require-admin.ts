import type { Session } from "next-auth";
import { NextResponse } from "next/server";

export function isAdmin(session: Session | null | undefined): boolean {
  return session?.user?.role === "ADMIN";
}

export function requireAdminResponse(
  session: Session | null | undefined,
): NextResponse | null {
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return null;
}
