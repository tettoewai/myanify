import { prisma } from "@/db";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

function getClientCreds() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId) throw new Error("SPOTIFY_CLIENT_ID is not configured");
  return { clientId, clientSecret };
}

export async function refreshSpotifyAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number; scope?: string }> {
  const { clientId, clientSecret } = getClientCreds();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  // Mobile PKCE logins have no client secret; web logins do.
  // Prefer confidential-client refresh when secret exists.
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  } else {
    body.set("client_id", clientId);
  }
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify refresh failed (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Returns a valid Spotify access token for a Myanify user, refreshing
 * via the stored Account.refresh_token when expired.
 * Returns null when the user never connected Spotify.
 */
export async function getValidSpotifyAccessToken(
  userId: string,
): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "spotify" },
  });
  if (!account?.access_token) return null;

  const expiresAtMs =
    account.expires_at != null ? account.expires_at * 1000 : null;
  // Refresh if expiring within 60s (or expiry unknown but we have a refresh token → try once lazily? No: keep token).
  if (
    expiresAtMs != null &&
    Date.now() < expiresAtMs - 60_000
  ) {
    return account.access_token;
  }
  if (expiresAtMs == null) return account.access_token;
  if (!account.refresh_token) return account.access_token;

  try {
    const refreshed = await refreshSpotifyAccessToken(account.refresh_token);
    const newExpiresAt = Math.floor(Date.now() / 1000 + refreshed.expires_in);
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: refreshed.access_token,
        expires_at: newExpiresAt,
        scope: refreshed.scope ?? account.scope,
      },
    });
    return refreshed.access_token;
  } catch (error) {
    console.error("Spotify token refresh failed:", error);
    // Return stale token so caller surfaces Spotify's 401, not a 500
    return account.access_token;
  }
}

export async function spotifyFetch(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const accessToken = await getValidSpotifyAccessToken(userId);
  if (!accessToken) {
    return Response.json({ error: "Spotify not connected" }, { status: 404 });
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
