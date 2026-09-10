import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { credentialsProvider, googleProvider, spotifyProvider } from "@/lib/auth-providers";

// Create handlers with credentials provider (only in API route, not middleware)
// This runs in Node.js runtime, so it can use bcryptjs
// Note: We don't need PrismaAdapter since we're using JWT sessions, not database sessions
const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";

const { handlers } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [credentialsProvider, googleProvider, spotifyProvider],
  // Fallback secret for local dev to avoid JSON parse errors when missing env
  secret: authSecret,
  trustHost: true, // Trust all hosts (safe for development)
});

export const { GET, POST } = handlers;

// Force Node.js runtime (required for bcryptjs which uses Node.js crypto)
export const runtime = "nodejs";
