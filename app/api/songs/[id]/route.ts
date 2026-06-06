import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { isAdmin } from "@/lib/require-admin";
import { resolveSongId } from "@/lib/api-entity";
import {
  parseCommaList,
  resolveEntitySlug,
} from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { formatSongResponse } from "@/lib/song-response";

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

    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        seo: true,
        artists: {
          include: {
            artist: true,
          },
        },
        album: true,
        genre: true,
        lyrics: {
          where: {
            language: "my",
          },
        },
      },
    });

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const session = await getSession();
    if (!song.isPublished && !isAdmin(session)) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json(formatSongResponse(song, request));
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
        artists: {
          include: {
            artist: true,
          },
        },
        album: true,
        genre: true,
        lyrics: {
          where: {
            language: "my",
          },
        },
      },
    });

    return NextResponse.json(formatSongResponse(song, request));
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting song:", error);
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    );
  }
}
