import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Create auth without providers or adapter (for middleware compatibility)
// This version doesn't import bcryptjs or prisma, so it can run in edge runtime
const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";

export const {
  handlers: baseHandlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  // Fallback secret for local dev to avoid JSON parse errors when missing env
  secret: authSecret,
  trustHost: true, // Trust all hosts (safe for development)
});
