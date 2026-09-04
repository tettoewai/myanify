import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendResetEmail } from "@/lib/email";
import { authLimiter, enforceRateLimit } from "@/lib/rate-limit";

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, authLimiter, "forgot-password");
  if (limited) return limited;

  try {
    const { email: rawEmail } = await req.json();

    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const email = String(rawEmail).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success even if user doesn't exist (security best practice)
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists, a reset link has been sent" },
        { status: 200 },
      );
    }

    // Generate reset token — store only the SHA-256 hash so a DB read
    // cannot be used to reset passwords while the token is valid.
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashResetToken(resetToken),
        resetTokenExpiry,
      },
    });

    // Send email with reset link (raw token, never stored)
    await sendResetEmail(email, resetToken);

    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
