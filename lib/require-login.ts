/**
 * Redirect unauthenticated users to login with a return URL.
 * Client-only — use from event handlers (play, like, create playlist, etc.).
 */
export function getLoginUrl(callbackPath = "/settings"): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

export function requireLoginRedirect(callbackPath?: string): void {
  if (typeof window === "undefined") return;

  const path =
    callbackPath ?? `${window.location.pathname}${window.location.search}`;
  window.location.href = getLoginUrl(path);
}

export function isLoggedIn(
  session: { user?: { id?: string } } | null | undefined
): boolean {
  return Boolean(session?.user?.id);
}
