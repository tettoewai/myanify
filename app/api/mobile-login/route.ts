import { NextResponse } from "next/server";
import { authorizeCredentials } from "@/lib/auth-providers";
import jwt from "jsonwebtoken";
import { authLimiter, enforceRateLimit } from "@/lib/rate-limit";

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, authLimiter, "mobile-login");
  if (limited) return limited;

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    // Authenticate using the shared logic
    const user = await authorizeCredentials(body);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    // Generate a JWT token for the mobile app
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.AUTH_SECRET!,
      { expiresIn: "7d" }, // Token expires in 7 days
    );

    return NextResponse.json(
      { token },
      { headers: { "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    // Return a clear 403 when the email hasn't been verified yet
    if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
      return NextResponse.json(
        { error: "EMAIL_NOT_VERIFIED" },
        {
          status: 403,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      );
    }

    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    );
  }
}
