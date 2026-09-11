import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Spotify from "next-auth/providers/spotify";
import { prisma } from "@/db";
import bcrypt from "bcryptjs";

export async function authorizeCredentials(credentials: any) {
  if (!credentials?.email || !credentials?.password) {
    return null;
  }

  const normalizedEmail = String(credentials.email).trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  // Prevent unverified users from signing in
  if (!user.emailVerified) {
    // Instead of throwing an error, return null with a specific flag
    // This allows us to handle it differently in the frontend
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  const passwordsMatch = await bcrypt.compare(
    credentials.password as string,
    user.passwordHash,
  );

  if (!passwordsMatch) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

export const credentialsProvider = Credentials({
  id: "credentials",
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  authorize: authorizeCredentials,
});

export const googleProvider = Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

/** Scopes for Sign in with Spotify + playlist/library read. */
export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "user-top-read",
].join(" ");

/** Trim whitespace/quotes that .env files and Docker secret mounts often add. */
function cleanEnv(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/^["']|["']$/g, "").trim();
  return cleaned || undefined;
}

const spotifyClientId = cleanEnv(process.env.SPOTIFY_CLIENT_ID);
const spotifyClientSecret = cleanEnv(process.env.SPOTIFY_CLIENT_SECRET);
if (!spotifyClientId || !spotifyClientSecret) {
  console.error(
    "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not configured – Spotify login will fail",
  );
}

export const spotifyProvider = Spotify({
  clientId: spotifyClientId!,
  clientSecret: spotifyClientSecret!,
  authorization: {
    // NOTE: url is required here. The Spotify default defines
    // `authorization` as a string; passing only `{ params }` replaces it
    // entirely and leaves url undefined -> "Invalid URL" / error=Configuration.
    url: "https://accounts.spotify.com/authorize",
    params: { scope: SPOTIFY_SCOPES },
  },
  token: {
    url: "https://accounts.spotify.com/api/token",
    /**
     * Guard the code->token exchange: Spotify (or a proxy in front of it)
     * sometimes answers with a non-JSON body (e.g. `Active pre...`), which
     * otherwise crashes inside openid-client with
     * `SyntaxError: ... is not valid JSON` wrapped in an opaque
     * CallbackRouteError. Validating here puts the real status/body in the
     * server logs and raises a descriptive error instead.
     */
    async conform(response: Response) {
      const raw = await response.clone().text();
      let isJson = false;
      try {
        const parsed: unknown = JSON.parse(raw);
        isJson = parsed !== null && typeof parsed === "object";
      } catch {
        isJson = false;
      }
      if (!isJson) {
        console.error("Spotify token endpoint returned non-JSON response:", {
          status: response.status,
          contentType: response.headers.get("content-type"),
          body: raw.slice(0, 500),
        });
        throw new Error(
          `Spotify token exchange failed (status ${response.status}): expected JSON but received: ${raw.slice(0, 200)}`,
        );
      }
      // Return undefined so Auth.js keeps handling the original response.
      return undefined;
    },
  },
});
