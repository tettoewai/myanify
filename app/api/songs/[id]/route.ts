import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { isAdmin } from "@/lib/require-admin";
import { resolveSongId } from "@/lib/api-entity";
import {
  parseCommaList,
  resolveEntitySlug,
} from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { formatSongResponse } from "@/lib/song-response";
import {
  buildSongInclude,
  buildSongIncludeFromRequest,
} from "@/lib/song-query";
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
    const id = await resolveSongId(param);
    if (!id) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const session = await getSession();
    const isAdminUser = isAdmin(session);

    const fetchSong = async () => {
      return withRetry(async () => {
        const song = await prisma.song.findUnique({
          where: { id },
          include: {
            seo: true,
            ...buildSongIncludeFromRequest(request),
          },
        });

        if (!song) {
          throw new Error("SONG_NOT_FOUND");
        }

        if (!song.isPublished && !isAdminUser) {
          throw new Error("SONG_NOT_FOUND");
        }

        return formatSongResponse(song, request);
      });
    };

    try {
      const payload = isAdminUser
        ? await fetchSong()
        : await getCached(
            cacheKeyFromRequest("songs:detail", request, id),
            fetchSong,
            CACHE_TTL.DETAIL,
          );

      return NextResponse.json(payload, {
        headers: isAdminUser
          ? {}
          : {
              "Cache-Control": `public, s-maxage=${CACHE_TTL.DETAIL}, stale-while-revalidate=${CACHE_TTL.DETAIL * 2}`,
            },
      });
    } catch (error) {
      if (error instanceof Error && error.message === "SONG_NOT_FOUND") {
        return NextResponse.json({ error: "Song not found" }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching song:", error);
    return NextResponse.json(
      { error: "Failed to fetch song" },
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
    const id = await resolveSongId(param);
    if (!id) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      isPublished,
      lyrics,
      artistIds,
      englishTitle,
      slug,
      description,
      englishDescription,
      alternativeTitles,
      language,
      releaseDate,
      seo,
      ...updateData
    } = body;

    const existing = await prisma.song.findUnique({
      where: { id },
      select: {
        seoId: true,
        slug: true,
        title: true,
        englishTitle: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const resolvedSlug = await resolveEntitySlug("song", {
      providedSlug: slug,
      fallbackName:
        englishTitle || updateData.title || existing.englishTitle || existing.title,
      entityId: id,
      currentSlug: slug === undefined ? existing.slug : undefined,
    });

    const seoId =
      seo !== undefined
        ? await upsertSeoMetadata(existing.seoId, seo)
        : existing.seoId;

    if (lyrics !== undefined) {
      await prisma.lyrics.deleteMany({
        where: { songId: id, language: "my" },
      });

      if (Array.isArray(lyrics) && lyrics.length > 0) {
        await prisma.lyrics.create({
          data: {
            songId: id,
            language: "my",
            lines: lyrics,
          },
        });
      }
    }

    const updateSongData: Record<string, unknown> = {
      ...updateData,
      slug: resolvedSlug,
      ...(englishTitle !== undefined && { englishTitle: englishTitle || null }),
      ...(description !== undefined && { description: description || null }),
      ...(englishDescription !== undefined && {
        englishDescription: englishDescription || null,
      }),
      ...(alternativeTitles !== undefined && {
        alternativeTitles: parseCommaList(alternativeTitles),
      }),
      ...(language !== undefined && { language: language || "my" }),
      ...(releaseDate !== undefined && {
        releaseDate: releaseDate ? new Date(releaseDate) : null,
      }),
      ...(isPublished !== undefined && { isPublished }),
      ...(seo !== undefined && { seoId }),
    };

    if (artistIds !== undefined && Array.isArray(artistIds)) {
      await prisma.songArtist.deleteMany({
        where: { songId: id },
      });

      if (artistIds.length > 0) {
        updateSongData.artists = {
          create: artistIds.map((artistId: string) => ({
            artistId: artistId,
          })),
        };
      }
    }

    const song = await prisma.song.update({
      where: { id },
      data: updateSongData,
      include: {
        seo: true,
        ...buildSongInclude(true),
      },
    });

    await invalidateContentCache();

    return NextResponse.json(
      formatSongResponse(song, request, { includeLyrics: true }),
    );
  } catch (error) {
    console.error("Error updating song:", error);
    return NextResponse.json(
      { error: "Failed to update song" },
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
    const id = await resolveSongId(param);
    if (!id) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    await prisma.song.delete({
      where: { id },
    });

    await invalidateContentCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting song:", error);
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    );
  }
}
