/**
 * Redirect unauthenticated users to login with a return URL.
 * Client-only — use from event handlers (play, like, create playlist, etc.).
 */

export type LoginPromptReason = "default" | "play" | "save";

type LoginPromptHandler = (
  callbackPath: string,
  reason: LoginPromptReason,
) => void;

let loginPromptHandler: LoginPromptHandler | null = null;

export function setLoginPromptHandler(handler: LoginPromptHandler | null): void {
  loginPromptHandler = handler;
}

export function getLoginUrl(callbackPath = "/home"): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

export function getLoginPromptCopy(reason: LoginPromptReason): {
  title: string;
  description: string;
} {
  switch (reason) {
    case "play":
      return {
        title: "Sign in to play",
        description:
          "You need to sign in to play songs and keep your listening history. Go to the login page?",
      };
    case "save":
      return {
        title: "Sign in to save",
        description:
          "You need to sign in to save songs, artists, and playlists to your library. Go to the login page?",
      };
    default:
      return {
        title: "Sign in required",
        description:
          "You need to sign in to use this feature. Go to the login page?",
      };
  }
}

export function requireLoginRedirect(
  callbackPath?: string,
  reason: LoginPromptReason = "default",
): void {
  if (typeof window === "undefined") return;

  const path =
    callbackPath ?? `${window.location.pathname}${window.location.search}`;

  if (loginPromptHandler) {
    loginPromptHandler(path, reason);
    return;
  }

  window.location.href = getLoginUrl(path);
}

export function isLoggedIn(
  session: { user?: { id?: string } } | null | undefined,
): boolean {
  return Boolean(session?.user?.id);
}
