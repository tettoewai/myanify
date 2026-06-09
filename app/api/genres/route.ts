import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { resolveEntitySlugForCreate } from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import {
  buildGenreSearchWhere,
  paginateItems,
  scoreNamedEntitySearch,
  sortBySearchScore,
} from "@/lib/search";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
  invalidateContentCache,
} from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const payload = await getCached(
      cacheKeyFromRequest("genres:list", request),
      async () => {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || searchParams.get("q");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "100");
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = buildGenreSearchWhere(search);
        }

        const total = await prisma.genre.count({ where });
        let genres = await prisma.genre.findMany({
          where,
          ...(search
            ? {}
            : {
                orderBy: { name: "asc" },
                take: limit,
                skip,
              }),
        });

        if (search) {
          genres = paginateItems(
            sortBySearchScore(genres, search, (query, genre) =>
              scoreNamedEntitySearch(query, {
                primaryName: genre.name,
                englishName: genre.englishName,
                description: genre.description,
                englishDescription: genre.englishDescription,
              }),
            ),
            page,
            limit,
          );
        }

        return {
          data: genres,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      CACHE_TTL.LIST,
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json(
      { error: "Failed to fetch genres" },
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
      imageUrl,
      description,
      englishDescription,
      seo,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const tempId = crypto.randomUUID();
    const resolvedSlug = await resolveEntitySlugForCreate("genre", {
      providedSlug: slug,
      fallbackName: englishName || name,
      tempId,
    });
    const seoId = await upsertSeoMetadata(null, seo);

    const genre = await prisma.genre.create({
      data: {
        name,
        englishName: englishName || null,
        slug: resolvedSlug,
        imageUrl: imageUrl || null,
        description: description || null,
        englishDescription: englishDescription || null,
        seoId,
      },
      include: { seo: true },
    });

    await invalidateContentCache();

    return NextResponse.json(genre, { status: 201 });
  } catch (error) {
    console.error("Error creating genre:", error);
    return NextResponse.json(
      { error: "Failed to create genre" },
      { status: 500 }
    );
  }
}
