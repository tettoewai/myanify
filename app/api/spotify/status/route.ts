import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "spotify" },
    select: { expires_at: true, scope: true },
  });
  if (!account) {
    return NextResponse.json({ connected: false });
  }
  return NextResponse.json({
    connected: true,
    expiresAt: account.expires_at ?? null,
    scope: account.scope ?? null,
  });
}
