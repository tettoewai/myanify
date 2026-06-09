import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { resolveArtistId } from "@/lib/api-entity";
import {
  parseCommaList,
  resolveEntitySlug,
  resolveEntitySlugForCreate,
} from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { formatSongResponse } from "@/lib/song-response";
import { calculateMonthlyListeners } from "@/lib/monthly-listeners";
import { buildSongIncludeFromRequest } from "@/lib/song-query";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
  invalidateContentCache,
} from "@/lib/cache";

function buildArtistInclude(request: Request) {
  return {
    seo: true,
    artistGenres: {
      include: {
        genre: true,
      },
    },
    songs: {
      where: {
        song: {
          isPublished: true,
        },
      },
      include: {
        song: {
          include: buildSongIncludeFromRequest(request),
        },
      },
    },
  } as const;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: param } = await params;
    const id = await resolveArtistId(param);
    if (!id) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const payload = await getCached(
      cacheKeyFromRequest("artists:detail", request, id),
      async () => {
        const artist = await prisma.artist.findUnique({
          where: { id },
          include: buildArtistInclude(request),
        });

        if (!artist) {
          throw new Error("ARTIST_NOT_FOUND");
        }

        const transformedSongs = (artist as any).songs?.map(
          (songArtist: any) => {
            const song = songArtist.song;
            return {
              ...songArtist,
              song: formatSongResponse(song, request),
            };
          },
        );

        const monthlyListeners = await calculateMonthlyListeners(id);

        return {
          ...artist,
          monthlyListeners: Math.max(artist.monthlyListeners, monthlyListeners),
          songs: transformedSongs,
        };
      },
      CACHE_TTL.DETAIL,
    );

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "ARTIST_NOT_FOUND") {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    console.error("Error fetching artist:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: param } = await params;
    const id = await resolveArtistId(param);
    if (!id) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    await prisma.artist.delete({
      where: { id },
    });

    await invalidateContentCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting artist:", error);
    return NextResponse.json(
      { error: "Failed to delete artist" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id: param } = await params;
    const id = await resolveArtistId(param);
    if (!id) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      englishName,
      slug,
      aliases,
      bio,
      englishBio,
      country,
      imageUrl,
      seo,
    } = body;

    const existing = await prisma.artist.findUnique({
      where: { id },
      select: { seoId: true, slug: true, name: true, englishName: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const resolvedSlug = await resolveEntitySlug("artist", {
      providedSlug: slug,
      fallbackName: englishName || name || existing.englishName || existing.name,
      entityId: id,
      currentSlug: slug === undefined ? existing.slug : undefined,
    });

    const seoId =
      seo !== undefined
        ? await upsertSeoMetadata(existing.seoId, seo)
        : existing.seoId;

    const artist = await prisma.artist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(englishName !== undefined && { englishName: englishName || null }),
        slug: resolvedSlug,
        ...(aliases !== undefined && { aliases: parseCommaList(aliases) }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(englishBio !== undefined && { englishBio: englishBio || null }),
        ...(country !== undefined && { country: country || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(seo !== undefined && { seoId }),
      },
      include: { seo: true },
    });

    await invalidateContentCache();

    return NextResponse.json(artist);
  } catch (error) {
    console.error("Error updating artist:", error);
    return NextResponse.json(
      { error: "Failed to update artist" },
      { status: 500 }
    );
  }
}
