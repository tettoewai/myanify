import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Create auth without providers or adapter (for middleware compatibility)
// This version doesn't import bcryptjs or prisma, so it can run in edge runtime
function getAuthSecret(): string {
  const raw =
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
  // Trim surrounding quotes and whitespace – dotenv vs Vercel env may differ ("blah blah" vs blah blah)
  return raw.trim().replace(/^["']|["']$/g, "").trim() || "dev-secret";
}
const authSecret = getAuthSecret();

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
