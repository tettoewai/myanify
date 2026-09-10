import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { isAdmin } from "@/lib/require-admin";
import {
  parseCommaList,
  resolveEntitySlugForCreate,
} from "@/lib/entity-admin";
import { upsertSeoMetadata } from "@/lib/seo-admin";
import { formatSongResponse, formatSongsResponse } from "@/lib/song-response";
import {
  buildSongInclude,
  buildSongIncludeFromRequest,
} from "@/lib/song-query";
import {
  buildSongSearchWhere,
  paginateItems,
  scoreSongSearch,
  sortBySearchScore,
} from "@/lib/search";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
  invalidateContentCache,
} from "@/lib/cache";
import { notifyNewSong } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      englishTitle,
      slug,
      description,
      englishDescription,
      alternativeTitles,
      language,
      releaseDate,
      duration,
      audioUrl,
      coverUrl,
      artistId,
      artistIds,
      genreId,
      albumId,
      isPremium,
      isPublished,
      lyrics,
      seo,
    } = body;

    const artistIdsArray = artistIds && Array.isArray(artistIds) && artistIds.length > 0
      ? artistIds
      : artistId
      ? [artistId]
      : [];

    if (!title || !duration || !audioUrl || artistIdsArray.length === 0) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, duration, audioUrl, and at least one artistId",
        },
        { status: 400 }
      );
    }

    const tempId = crypto.randomUUID();
    const resolvedSlug = await resolveEntitySlugForCreate("song", {
      providedSlug: slug,
      fallbackName: englishTitle || title,
      tempId,
    });
    const seoId = await upsertSeoMetadata(null, seo);

    const song = await prisma.song.create({
      data: {
        title,
        englishTitle: englishTitle || null,
        slug: resolvedSlug,
        description: description || null,
        englishDescription: englishDescription || null,
        alternativeTitles: parseCommaList(alternativeTitles),
        language: language || "my",
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        duration: parseInt(duration),
        audioUrl,
        coverUrl: coverUrl || null,
        genreId: genreId || null,
        albumId: albumId || null,
        isPremium: isPremium || false,
        isPublished: isPublished || false,
        seoId,
        artists: {
          create: artistIdsArray.map((id: string) => ({
            artistId: id,
          })),
        },
        lyrics: lyrics && Array.isArray(lyrics) && lyrics.length > 0
          ? {
              create: {
                language: "my",
                lines: lyrics,
              },
            }
          : undefined,
      },
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

    await invalidateContentCache();

    if (song.isPublished) {
      const artistNames = song.artists.map((sa) => sa.artist.name);
      const artistIds = song.artists.map((sa) => sa.artistId);
      void notifyNewSong(
        song.id,
        song.title,
        song.englishTitle,
        artistNames,
        song.coverUrl,
        artistIds,
      );
    }

    return NextResponse.json(
      formatSongResponse(song, request, { includeLyrics: true }),
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating song:", error);
    return NextResponse.json(
      { error: "Failed to create song" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const isAdminUser = isAdmin(session);

    const fetchSongs = async () => {
      return withRetry(async () => {
        const { searchParams } = new URL(request.url);
        const genreId = searchParams.get("genreId");
        const artistId = searchParams.get("artistId");
        const albumId = searchParams.get("albumId");
        const isPublishedParam = searchParams.get("isPublished");
        const isPublished =
          isPublishedParam === null ? undefined : isPublishedParam === "true";
        const search = searchParams.get("search") || searchParams.get("q");
        const rawPage = parseInt(searchParams.get("page") || "1");
        const rawLimit = parseInt(searchParams.get("limit") || "50");
        const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
        const limit = Number.isFinite(rawLimit)
          ? Math.min(100, Math.max(1, rawLimit))
          : 50;
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {
          ...(genreId && { genreId }),
          ...(albumId && { albumId }),
        };

        if (isAdminUser) {
          if (isPublished !== undefined) {
            where.isPublished = isPublished;
          }
        } else {
          where.isPublished = true;
        }

        if (artistId) {
          where.artists = {
            some: {
              artistId: artistId,
            },
          };
        }

        if (search) {
          where.OR = buildSongSearchWhere(search);
        }

        const total = await prisma.song.count({ where });
        const songInclude = buildSongIncludeFromRequest(request);

        let songs = await prisma.song.findMany({
          where,
          include: songInclude,
          ...(search
            ? {}
            : {
                orderBy: { createdAt: "desc" },
                take: limit,
                skip,
              }),
        });

        if (search) {
          songs = paginateItems(
            sortBySearchScore(songs, search, scoreSongSearch, (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
            ),
            page,
            limit,
          );
        }

        return {
          data: formatSongsResponse(songs, request),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      });
    };

    const payload = isAdminUser
      ? await fetchSongs()
      : await getCached(
          cacheKeyFromRequest("songs:list", request),
          fetchSongs,
          CACHE_TTL.LIST,
        );

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}
