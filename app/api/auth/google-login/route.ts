import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

// Validate that GOOGLE_CLIENT_ID is set
if (!process.env.GOOGLE_CLIENT_ID) {
  console.error("GOOGLE_CLIENT_ID environment variable is not set");
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { googleAccessToken, idToken } = body;

    if (!googleAccessToken && !idToken) {
      return NextResponse.json(
        { error: "Google access token or ID token is required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    if (idToken) {
      // Verify ID token (New implementation)
      try {
        // Check if GOOGLE_CLIENT_ID is configured
        if (!process.env.GOOGLE_CLIENT_ID) {
          console.error("GOOGLE_CLIENT_ID is not configured");
          return NextResponse.json(
            {
              error: "OAuth client not configured",
              details: "GOOGLE_CLIENT_ID environment variable is missing"
            },
            {
              status: 500,
              headers: { "Access-Control-Allow-Origin": "*" },
            }
          );
        }

        // Build audience list with all possible client IDs
        const audience = [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
          process.env.GOOGLE_IOS_CLIENT_ID,
        ].filter(Boolean) as string[];

        if (audience.length === 0) {
          console.error("No valid Google client IDs configured");
          return NextResponse.json(
            {
              error: "OAuth client not configured",
              details: "At least one Google client ID must be configured"
            },
            {
              status: 500,
              headers: { "Access-Control-Allow-Origin": "*" },
            }
          );
        }

        console.log("Verifying ID token with audience:", audience);

        const ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: audience,
        });
        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error("Invalid ID token payload");
        }
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      } catch (error: any) {
        console.error("ID token verification failed:", {
          error: error.message,
          code: error.code,
          details: error.toString(),
        });

        // Provide more specific error messages
        let errorMessage = "Invalid Google ID token";
        if (error.message?.includes("invalid_client") || error.code === "invalid_client") {
          errorMessage = "OAuth client configuration error. Please check GOOGLE_CLIENT_ID environment variable.";
        } else if (error.message?.includes("audience")) {
          errorMessage = "Token audience mismatch. Ensure the client ID matches the one used to generate the token.";
        }

        return NextResponse.json(
          {
            error: errorMessage,
            details: error.message || "Token verification failed"
          },
          {
            status: 401,
            headers: { "Access-Control-Allow-Origin": "*" },
          }
        );
      }
    } else if (googleAccessToken) {
      // Verify access token (Backward compatibility)
      const googleResponse = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleAccessToken}`
      );

      if (!googleResponse.ok) {
        return NextResponse.json(
          { error: "Invalid Google access token" },
          {
            status: 401,
            headers: { "Access-Control-Allow-Origin": "*" },
          }
        );
      }

      const googleUser = await googleResponse.json();
      email = googleUser.email;
      name = googleUser.name;
      picture = googleUser.picture;
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email not provided by Google" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
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
          headers: { "Access-Control-Allow-Origin": "*" },
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
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
