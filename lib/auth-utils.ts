import { auth } from "@/auth";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";

const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";

export async function getSession() {
  // 1. Try standard NextAuth session (cookies)
  const session = await auth();
  if (session?.user) {
    return session;
  }

  // 2. Try Bearer token from Authorization header (for mobile apps)
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, authSecret) as any;
      if (decoded && decoded.id) {
        return {
          user: {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name, // optional
          },
          expires: new Date(decoded.exp * 1000).toISOString(),
        };
      }
    } catch (error) {
      console.error("JWT verification failed:", error);
    }
  }

  return null;
}
