import { UserRole } from "@prisma/client";
import { toast } from "sonner";

/**
 * Master switch for "Login with Spotify" (web buttons, NextAuth provider,
 * and the mobile PKCE endpoint all check this flag).
 * Currently DISABLED — Spotify login requires a Spotify Premium-eligible
 * app setup. Google + email login keep working.
 * To re-enable: set to `true`. No other changes needed.
 * (Lives here instead of auth-providers.ts so client components can import
 * it — auth-providers pulls in bcryptjs/prisma which can't be bundled for
 * the browser.)
 */
export const SPOTIFY_LOGIN_ENABLED = false;

export function getAuthRedirectUrl(
  callbackUrl: string | null,
  role: UserRole,
): string {
  if (callbackUrl?.startsWith("/admin") && role !== UserRole.ADMIN) {
    toast.error("Staff access required for the admin dashboard");
    return "/home";
  }
  if (callbackUrl) {
    return callbackUrl;
  }
  return "/home";
}
