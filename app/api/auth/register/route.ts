import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24; // Token expires in 24 hours

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Check if user is already verified
      if (existingUser.emailVerified) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 400 },
        );
      } else {
        // User exists but not verified - check if token is still valid
        const now = new Date();
        const tokenExpired =
          existingUser.verificationTokenExpiry &&
          existingUser.verificationTokenExpiry < now;

        if (tokenExpired || !existingUser.verificationToken) {
          // Generate new token if expired
          const verificationToken = crypto.randomBytes(32).toString("hex");
          const verificationTokenExpiry = new Date(
            Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
          );

          const passwordHash = await bcrypt.hash(password, 10);

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash: passwordHash,
              verificationToken,
              verificationTokenExpiry,
              emailVerified: null,
            },
          });

          await sendVerificationEmail(email, verificationToken);

          return NextResponse.json(
            {
              message: "New verification link sent. Please check your email.",
              requiresVerification: true,
            },
            { status: 200 },
          );
        } else {
          // Token still valid - resend the same token
          await sendVerificationEmail(email, existingUser.verificationToken);

          return NextResponse.json(
            {
              message: "Verification email resent. Please check your email.",
              requiresVerification: true,
            },
            { status: 200 },
          );
        }
      }
    }

    // Create new user with expiry
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json(
      {
        message:
          "Account created. Please check your email to verify your account.",
        requiresVerification: true,
        userId: user.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
