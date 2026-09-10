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

export const spotifyProvider = Spotify({
  clientId: process.env.SPOTIFY_CLIENT_ID!,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
  authorization: {
    // NOTE: url is required here. The Spotify default defines
    // `authorization` as a string; passing only `{ params }` replaces it
    // entirely and leaves url undefined -> "Invalid URL" / error=Configuration.
    url: "https://accounts.spotify.com/authorize",
    params: { scope: SPOTIFY_SCOPES },
  },
});
