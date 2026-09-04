import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { authLimiter, enforceRateLimit } from "@/lib/rate-limit";

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, authLimiter, "validate-reset-token");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const hashedToken = hashResetToken(token);

    let user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    // Fallback for pre-hashing plaintext tokens.
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
