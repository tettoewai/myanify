import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 },
      );
    }

    // Find user with the token and check expiry
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      // Check if user exists but token expired
      const expiredUser = await prisma.user.findFirst({
        where: {
          verificationToken: token,
        },
      });

      if (expiredUser) {
        return NextResponse.json(
          {
            error: "Verification link has expired. Please request a new one.",
            expired: true,
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 },
      );
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null, // Clear expiry
      },
    });

    return NextResponse.json(
      {
        message: "Email verified successfully! You can now sign in.",
        success: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
