import { auth } from "@/auth";
import jwt from "jsonwebtoken";
import { headers } from "next/headers";

function getAuthSecret(): string {
  const raw =
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
  return raw.trim().replace(/^["']|["']$/g, "").trim() || "dev-secret";
}
const authSecret = getAuthSecret();

// Retry helper for transient DB/Neon cold-start failures
async function withRetries<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const msg = String(e?.message ?? "");
      const isTransient =
        /timeout|terminating|connection|ECONN|ETIMEDOUT|fetch failed/i.test(msg) ||
        e?.code === "P1001"; // Prisma can't reach DB
      if (!isTransient || i === retries) break;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastError;
}

export async function getSession() {
  // 1. Try standard NextAuth session (cookies) with cold-start retry
  try {
    const session = await withRetries(() => auth());
    if (session?.user) {
      return session;
    }
  } catch (e) {
    console.error("[getSession] auth() failed (transient?):", (e as Error)?.message);
  }

  // 2. Try Bearer token from Authorization header (for mobile apps)
  const headersList = await headers();
  // Next headers() is case-insensitive but check both for safety
  const authHeader =
    headersList.get("authorization") ?? headersList.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (!token) return null;
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
    } catch (error: any) {
      // Only log unexpected errors; TokenExpiredError is expected after 7d
      if (error?.name !== "TokenExpiredError") {
        console.error("JWT verification failed:", error?.message);
      } else {
        console.warn("[getSession] mobile token expired");
      }
    }
  }

  return null;
}
