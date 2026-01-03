import { NextResponse } from "next/server";
import { authorizeCredentials } from "@/lib/auth-providers";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Authenticate using the shared logic
    const user = await authorizeCredentials(body);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate a JWT token for the mobile app
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.AUTH_SECRET!,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
