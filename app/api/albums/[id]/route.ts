import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { resolveAlbumId } from "@/lib/api-entity";
import {
  parseCommaList,
  resolveEntitySlug,
  resolveEntitySlugForCreate,
} from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { isAlbumType } from "@/lib/album-type";
import { formatSongsResponse } from "@/lib/song-response";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
  invalidateContentCache,
} from "@/lib/cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: param } = await params;
    const id = await resolveAlbumId(param);
    if (!id) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const payload = await getCached(
      cacheKeyFromRequest("albums:detail", request, id),
      async () => {
        const album = await prisma.album.findUnique({
          where: { id },
          include: {
            seo: true,
            songs: {
              include: {
                artists: {
                  include: {
                    artist: true,
                  },
                },
                genre: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!album) {
          throw new Error("ALBUM_NOT_FOUND");
        }

        return {
          ...album,
          songs: formatSongsResponse(album.songs, request),
        };
      },
      CACHE_TTL.DETAIL,
    );

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL.DETAIL}, stale-while-revalidate=${CACHE_TTL.DETAIL * 2}`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALBUM_NOT_FOUND") {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    console.error("Error fetching album:", error);
    return NextResponse.json(
      { error: "Failed to fetch album" },
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
    const id = await resolveAlbumId(param);
    if (!id) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      englishName,
      slug,
      coverUrl,
      description,
      englishDescription,
      releaseDate,
      type,
      seo,
    } = body;

    const existing = await prisma.album.findUnique({
      where: { id },
      select: { seoId: true, slug: true, name: true, englishName: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const resolvedSlug = await resolveEntitySlug("album", {
      providedSlug: slug,
      fallbackName: englishName || name || existing.englishName || existing.name,
      entityId: id,
      currentSlug: slug === undefined ? existing.slug : undefined,
    });

    const seoId =
      seo !== undefined
        ? await upsertSeoMetadata(existing.seoId, seo)
        : existing.seoId;

    const album = await prisma.album.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(englishName !== undefined && { englishName: englishName || null }),
        slug: resolvedSlug,
        ...(type !== undefined && isAlbumType(type) && { type }),
        ...(coverUrl !== undefined && { coverUrl: coverUrl || null }),
        ...(description !== undefined && { description: description || null }),
        ...(englishDescription !== undefined && {
          englishDescription: englishDescription || null,
        }),
        ...(releaseDate !== undefined && {
          releaseDate: releaseDate ? new Date(releaseDate) : null,
        }),
        ...(seo !== undefined && { seoId }),
      },
      include: { seo: true },
    });

    await invalidateContentCache();

    return NextResponse.json(album);
  } catch (error) {
    console.error("Error updating album:", error);
    return NextResponse.json(
      { error: "Failed to update album" },
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
    const id = await resolveAlbumId(param);
    if (!id) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    await prisma.album.delete({
      where: { id },
    });

    await invalidateContentCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting album:", error);
    return NextResponse.json(
      { error: "Failed to delete album" },
      { status: 500 }
    );
  }
}
