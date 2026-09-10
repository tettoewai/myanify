import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { SPOTIFY_SCOPES } from "@/lib/auth-providers";
import { authLimiter, enforceRateLimit } from "@/lib/rate-limit";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS });
}

interface SpotifyMe {
  id: string;
  email?: string;
  display_name?: string;
  images?: Array<{ url: string }>;
}

/**
 * Mobile (Expo AuthSession, PKCE) login.
 * Body: { code, codeVerifier, redirectUri }
 * Exchanges the code server-side, upserts User + Spotify Account,
 * returns the same 30d Myanify JWT as google-login.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, authLimiter, "spotify-login");
  if (limited) return limited;

  try {
    const { code, codeVerifier, redirectUri } = await request.json();

    if (!code || !codeVerifier || !redirectUri) {
      return NextResponse.json(
        { error: "code, codeVerifier and redirectUri are required" },
        { status: 400, headers: CORS },
      );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId) {
      return NextResponse.json(
        { error: "OAuth client not configured" },
        { status: 500, headers: CORS },
      );
    }

    // PKCE exchange. Mobile uses a public client (no secret); include the
    // secret only when this server owns the Spotify app (confidential web).
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    });
    const tokenHeaders: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (clientSecret) {
      tokenHeaders.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
    }

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: tokenHeaders,
      body: tokenBody,
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("Spotify code exchange failed:", tokenRes.status, text);
      return NextResponse.json(
        { error: "Invalid Spotify authorization code" },
        { status: 401, headers: CORS },
      );
    }
    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
      token_type?: string;
    };

    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!meRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify profile" },
        { status: 401, headers: CORS },
      );
    }
    const me = (await meRes.json()) as SpotifyMe;
    if (!me.email) {
      return NextResponse.json(
        {
          error:
            "Spotify did not share an email address. Grant user-read-email access and try again.",
        },
        { status: 400, headers: CORS },
      );
    }

    // Upsert user (auto-link on email, same as web OAuth callback)
    let user = await prisma.user.findUnique({ where: { email: me.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: me.email,
          name: me.display_name || me.email.split("@")[0],
          avatarUrl: me.images?.[0]?.url,
          role: UserRole.LISTENER,
          emailVerified: new Date(),
        },
      });
    } else {
      const updates: Record<string, unknown> = {};
      if (!user.emailVerified) updates.emailVerified = new Date();
      if (!user.name && me.display_name) updates.name = me.display_name;
      if (!user.avatarUrl && me.images?.[0]?.url)
        updates.avatarUrl = me.images[0].url;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    const expiresAt = Math.floor(Date.now() / 1000 + tokens.expires_in);
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "spotify",
          providerAccountId: me.id,
        },
      },
      create: {
        userId: user.id,
        type: "oauth",
        provider: "spotify",
        providerAccountId: me.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        token_type: tokens.token_type ?? "Bearer",
        scope: tokens.scope ?? SPOTIFY_SCOPES,
      },
      update: {
        userId: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? undefined,
        expires_at: expiresAt,
        scope: tokens.scope ?? undefined,
      },
    });

    const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!authSecret) {
      console.error("AUTH_SECRET is not defined");
      return NextResponse.json(
        { error: "Internal server configuration error" },
        { status: 500, headers: CORS },
      );
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      authSecret,
      { expiresIn: "30d" },
    );
    return NextResponse.json({ token }, { headers: CORS });
  } catch (error) {
    console.error("Spotify login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS },
    );
  }
}
