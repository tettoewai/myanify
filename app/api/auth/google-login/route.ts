import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { googleAccessToken } = body;

    if (!googleAccessToken) {
      return NextResponse.json(
        { error: "Google access token is required" },
        { 
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    // 1. Verify token with Google
    const googleResponse = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleAccessToken}`
    );

    if (!googleResponse.ok) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { 
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    const googleUser = await googleResponse.json();
    const { email, name, picture } = googleUser;

    if (!email) {
      return NextResponse.json(
        { error: "Email not provided by Google" },
        { 
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    // 2. Upsert user in database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          avatarUrl: picture,
          role: UserRole.LISTENER,
        },
      });
    } else {
      // Update existing user with Google info if not set
      if (!user.name || !user.avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: user.name || name,
            avatarUrl: user.avatarUrl || picture,
          },
        });
      }
    }

    // 3. Generate a JWT token for the mobile app
    const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    
    if (!authSecret) {
      console.error("AUTH_SECRET is not defined");
      return NextResponse.json(
        { error: "Internal server configuration error" },
        { 
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" }
        }
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      authSecret,
      { expiresIn: "30d" } // Consistent with NextAuth session duration
    );

    return NextResponse.json(
      { token },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { 
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" }
      }
    );
  }
}
