import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSearchClient } from "@/lib/typesense/client";
import { formatSongsResponse } from "@/lib/song-response";
import { buildSongIncludeFromRequest } from "@/lib/song-query";
import {
  CACHE_TTL,
  cacheKeyFromRequest,
  getCached,
} from "@/lib/cache";

const COLLECTIONS = [
  "songs",
  "artists",
  "albums",
  "genres",
  "playlists",
] as const;

type SearchCollection = (typeof COLLECTIONS)[number];

const queryByMap: Record<SearchCollection, string> = {
  songs: "title,englishTitle,artistNames,albumTitle",
  artists: "name,englishName,genreNames",
  albums: "title,englishName,artistNames",
  genres: "name,englishName",
  playlists: "name,englishName,description",
};

const sortByMap: Partial<Record<SearchCollection, string>> = {
  songs: "releaseDate:desc",
  albums: "releaseDate:desc",
  playlists: "createdAt:desc",
};

function orderByIds<T extends { id: string }>(
  items: T[],
  ids: string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is T => Boolean(item));
}

async function searchCollection(
  collection: SearchCollection,
  q: string,
  perPage: number,
) {
  const client = getSearchClient();
  return client
    .collections(collection)
    .documents()
    .search({
      q,
      query_by: queryByMap[collection],
      sort_by: sortByMap[collection],
      per_page: perPage,
    });
}

async function hydrateSongs(ids: string[], request: NextRequest) {
  if (ids.length === 0) return [];

  const songs = await prisma.song.findMany({
    where: { id: { in: ids }, isPublished: true },
    include: buildSongIncludeFromRequest(request),
  });

  return orderByIds(songs, ids);
}

async function hydrateArtists(ids: string[]) {
  if (ids.length === 0) return [];

  const artists = await prisma.artist.findMany({
    where: { id: { in: ids } },
    include: {
      artistGenres: { include: { genre: true } },
    },
  });

  return orderByIds(artists, ids);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q") || "";
  const collection = searchParams.get("collection");
  const perPage = parseInt(searchParams.get("per_page") || "20", 10);

  if (!q.trim()) {
    return NextResponse.json({ hits: [], songs: [], artists: [] });
  }

  if (!collection || collection === "all") {
    try {
      const payload = await getCached(
        cacheKeyFromRequest("search:all", req),
        async () => {
          const [songsResults, artistsResults] = await Promise.all([
            searchCollection("songs", q, perPage),
            searchCollection("artists", q, perPage),
          ]);

          const songIds =
            songsResults.hits?.map((hit) =>
              String((hit.document as { id: string }).id),
            ) ?? [];
          const artistIds =
            artistsResults.hits?.map((hit) =>
              String((hit.document as { id: string }).id),
            ) ?? [];

          const [songs, artists] = await Promise.all([
            hydrateSongs(songIds, req),
            hydrateArtists(artistIds),
          ]);

          return {
            songs: formatSongsResponse(songs, req),
            artists,
          };
        },
        CACHE_TTL.SEARCH,
      );

      return NextResponse.json(payload);
    } catch (error) {
      console.error("Typesense combined search error:", error);
      return NextResponse.json(
        { songs: [], artists: [], error: "Search failed" },
        { status: 500 },
      );
    }
  }

  if (!COLLECTIONS.includes(collection as SearchCollection)) {
    return NextResponse.json(
      { hits: [], error: "Invalid collection" },
      { status: 400 },
    );
  }

  try {
    const payload = await getCached(
      cacheKeyFromRequest("search", req, collection),
      async () => {
        const results = await searchCollection(
          collection as SearchCollection,
          q,
          perPage,
        );
        const hits = results.hits?.map((hit) => hit.document) || [];
        return { hits };
      },
      CACHE_TTL.SEARCH,
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error(`Typesense search error on ${collection}:`, error);
    return NextResponse.json(
      { hits: [], error: "Search failed" },
      { status: 500 },
    );
  }
}
