import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { spotifyFetch } from "@/lib/spotify";

/**
 * GET /api/spotify/playlists?limit=20&offset=0
 * Works for web (NextAuth cookie session) and mobile (Bearer JWT)
 * via getSession(). Requires a connected Spotify account.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    50,
  );
  const offset = Math.max(
    Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );

  let res: Response;
  try {
    res = await spotifyFetch(
      session.user.id,
      `/me/playlists?limit=${limit}&offset=${offset}`,
    );
  } catch (error) {
    console.error("Spotify playlists fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to reach Spotify" },
      { status: 502 },
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as any)?.error?.message ??
      (data as any)?.error ??
      "Spotify request failed";
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const items = ((data as any).items ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    public: p.public ?? null,
    collaborative: p.collaborative ?? false,
    tracksTotal: p.tracks?.total ?? 0,
    coverUrl: p.images?.[0]?.url ?? null,
    url: p.external_urls?.spotify ?? null,
  }));
  return NextResponse.json({
    items,
    total: (data as any).total ?? items.length,
    limit,
    offset,
  });
}
