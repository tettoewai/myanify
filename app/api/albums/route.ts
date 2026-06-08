import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { resolveEntitySlugForCreate } from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { isAlbumType } from "@/lib/album-type";
import {
  buildAlbumSearchWhere,
  paginateItems,
  scoreNamedEntitySearch,
  sortBySearchScore,
} from "@/lib/search";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = buildAlbumSearchWhere(search);
    }

    const total = await prisma.album.count({ where });
    let albums = await prisma.album.findMany({
      where,
      include: {
        _count: {
          select: { songs: true },
        },
      },
      ...(search
        ? {}
        : {
            orderBy: { name: "asc" },
            take: limit,
            skip,
          }),
    });

    if (search) {
      albums = paginateItems(
        sortBySearchScore(albums, search, (query, album) =>
          scoreNamedEntitySearch(query, {
            primaryName: album.name,
            englishName: album.englishName,
            description: album.description,
            englishDescription: album.englishDescription,
          }),
        ),
        page,
        limit,
      );
    }

    return NextResponse.json({
      data: albums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (type !== undefined && !isAlbumType(type)) {
      return NextResponse.json({ error: "Invalid album type" }, { status: 400 });
    }

    const tempId = crypto.randomUUID();
    const resolvedSlug = await resolveEntitySlugForCreate("album", {
      providedSlug: slug,
      fallbackName: englishName || name,
      tempId,
    });
    const seoId = await upsertSeoMetadata(null, seo);

    const album = await prisma.album.create({
      data: {
        name,
        englishName: englishName || null,
        slug: resolvedSlug,
        type: type && isAlbumType(type) ? type : "ALBUM",
        coverUrl: coverUrl || null,
        description: description || null,
        englishDescription: englishDescription || null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        seoId,
      },
      include: { seo: true },
    });

    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    console.error("Error creating album:", error);
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
