import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { resolveEntitySlugForCreate, parseCommaList } from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { calculateMonthlyListenersByArtistIds } from "@/lib/monthly-listeners";
import {
  buildArtistSearchWhere,
  paginateItems,
  scoreArtistSearch,
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
      cacheKeyFromRequest("artists:list", request),
      async () => {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || searchParams.get("q");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (search) {
          where.OR = buildArtistSearchWhere(search);
        }

        const total = await prisma.artist.count({ where });
        let artists = await prisma.artist.findMany({
          where,
          include: {
            artistGenres: {
              include: {
                genre: true,
              },
            },
          },
          ...(search
            ? {}
            : {
                orderBy: { monthlyListeners: "desc" },
                take: limit,
                skip,
              }),
        });

        const listenerCounts = await calculateMonthlyListenersByArtistIds(
          artists.map((artist) => artist.id),
        );

        let artistsWithListenerCounts = artists.map((artist) => ({
          ...artist,
          monthlyListeners: Math.max(
            artist.monthlyListeners,
            listenerCounts.get(artist.id) ?? 0,
          ),
        }));

        if (search) {
          artistsWithListenerCounts = paginateItems(
            sortBySearchScore(
              artistsWithListenerCounts,
              search,
              scoreArtistSearch,
              (left, right) => right.monthlyListeners - left.monthlyListeners,
            ),
            page,
            limit,
          );
        }

        return {
          data: artistsWithListenerCounts,
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
    console.error("Error fetching artists:", error);
    return NextResponse.json(
      { error: "Failed to fetch artists" },
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
      aliases,
      bio,
      englishBio,
      country,
      imageUrl,
      seo,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const tempId = crypto.randomUUID();
    const resolvedSlug = await resolveEntitySlugForCreate("artist", {
      providedSlug: slug,
      fallbackName: englishName || name,
      tempId,
    });
    const seoId = await upsertSeoMetadata(null, seo);

    const artist = await prisma.artist.create({
      data: {
        name,
        englishName: englishName || null,
        slug: resolvedSlug,
        aliases: parseCommaList(aliases),
        bio: bio || null,
        englishBio: englishBio || null,
        country: country || null,
        imageUrl: imageUrl || null,
        seoId,
      },
      include: { seo: true },
    });

    await invalidateContentCache();

    return NextResponse.json(artist, { status: 201 });
  } catch (error) {
    console.error("Error creating artist:", error);
    return NextResponse.json(
      { error: "Failed to create artist" },
      { status: 500 }
    );
  }
}
