import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { resolveGenreId } from "@/lib/api-entity";
import {
  resolveEntitySlug,
  resolveEntitySlugForCreate,
} from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
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
    const id = await resolveGenreId(param);
    if (!id) {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    const payload = await getCached(
      cacheKeyFromRequest("genres:detail", request, id),
      async () => {
        const genre = await prisma.genre.findUnique({
          where: { id },
          include: {
            seo: true,
            songs: {
              where: { isPublished: true },
              include: {
                artists: {
                  include: {
                    artist: true,
                  },
                },
                album: true,
              },
            },
          },
        });

        if (!genre) {
          throw new Error("GENRE_NOT_FOUND");
        }

        return {
          ...genre,
          songs: formatSongsResponse(genre.songs, request),
        };
      },
      CACHE_TTL.DETAIL,
    );

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "GENRE_NOT_FOUND") {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    console.error("Error fetching genre:", error);
    return NextResponse.json(
      { error: "Failed to fetch genre" },
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
    const id = await resolveGenreId(param);
    if (!id) {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    await prisma.genre.delete({
      where: { id },
    });

    await invalidateContentCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting genre:", error);
    return NextResponse.json(
      { error: "Failed to delete genre" },
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
    const id = await resolveGenreId(param);
    if (!id) {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      englishName,
      slug,
      imageUrl,
      description,
      englishDescription,
      seo,
    } = body;

    const existing = await prisma.genre.findUnique({
      where: { id },
      select: { seoId: true, slug: true, name: true, englishName: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    const resolvedSlug = await resolveEntitySlug("genre", {
      providedSlug: slug,
      fallbackName: englishName || name || existing.englishName || existing.name,
      entityId: id,
      currentSlug: slug === undefined ? existing.slug : undefined,
    });

    const seoId =
      seo !== undefined
        ? await upsertSeoMetadata(existing.seoId, seo)
        : existing.seoId;

    const genre = await prisma.genre.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(englishName !== undefined && { englishName: englishName || null }),
        slug: resolvedSlug,
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(description !== undefined && { description: description || null }),
        ...(englishDescription !== undefined && {
          englishDescription: englishDescription || null,
        }),
        ...(seo !== undefined && { seoId }),
      },
      include: { seo: true },
    });

    await invalidateContentCache();

    return NextResponse.json(genre);
  } catch (error) {
    console.error("Error updating genre:", error);
    return NextResponse.json(
      { error: "Failed to update genre" },
      { status: 500 }
    );
  }
}
