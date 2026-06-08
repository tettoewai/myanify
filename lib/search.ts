import type { Prisma } from "@prisma/client";

type InsensitiveContains = {
  contains: string;
  mode: "insensitive";
};

export function searchContains(query: string): InsensitiveContains {
  return { contains: query, mode: "insensitive" };
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function scoreSingleField(
  query: string,
  value: string | null | undefined,
  weights: {
    exact: number;
    prefix: number;
    contains: number;
  },
): number {
  if (!value) return 0;

  const normalizedValue = value.toLowerCase();
  if (normalizedValue === query) return weights.exact;
  if (normalizedValue.startsWith(query)) return weights.prefix;
  if (normalizedValue.includes(query)) return weights.contains;
  return 0;
}

function scoreStringList(
  query: string,
  values: string[] | null | undefined,
  weights: {
    exact: number;
    prefix: number;
    contains: number;
  },
): number {
  if (!values?.length) return 0;
  return values.reduce(
    (best, value) =>
      Math.max(best, scoreSingleField(query, value, weights)),
    0,
  );
}

function maxScore(scores: number[]): number {
  return scores.reduce((best, score) => Math.max(best, score), 0);
}

export function scoreNamedEntitySearch(
  query: string,
  fields: {
    primaryName?: string | null;
    englishName?: string | null;
    description?: string | null;
    englishDescription?: string | null;
    aliases?: string[] | null;
  },
): number {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return 0;

  const primaryNameScore = scoreSingleField(normalizedQuery, fields.primaryName, {
    exact: 1000,
    prefix: 800,
    contains: 600,
  });
  const englishNameScore = scoreSingleField(
    normalizedQuery,
    fields.englishName,
    {
      exact: 900,
      prefix: 700,
      contains: 500,
    },
  );
  const aliasScore = scoreStringList(normalizedQuery, fields.aliases, {
    exact: 450,
    prefix: 420,
    contains: 400,
  });
  const descriptionScore = scoreSingleField(
    normalizedQuery,
    fields.description,
    {
      exact: 300,
      prefix: 280,
      contains: 250,
    },
  );
  const englishDescriptionScore = scoreSingleField(
    normalizedQuery,
    fields.englishDescription,
    {
      exact: 240,
      prefix: 220,
      contains: 200,
    },
  );

  return maxScore([
    primaryNameScore,
    englishNameScore,
    aliasScore,
    descriptionScore,
    englishDescriptionScore,
  ]);
}

type SongSearchRecord = {
  title: string;
  englishTitle?: string | null;
  alternativeTitles?: string[] | null;
  description?: string | null;
  englishDescription?: string | null;
  artists?: Array<{
    artist: {
      name: string;
      englishName?: string | null;
      aliases?: string[] | null;
      bio?: string | null;
      englishBio?: string | null;
    };
  }>;
  album?: {
    name: string;
    englishName?: string | null;
    description?: string | null;
    englishDescription?: string | null;
  } | null;
  genre?: {
    name: string;
    englishName?: string | null;
    description?: string | null;
    englishDescription?: string | null;
  } | null;
};

export function scoreSongSearch(query: string, song: SongSearchRecord): number {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return 0;

  const selfScore = scoreNamedEntitySearch(normalizedQuery, {
    primaryName: song.title,
    englishName: song.englishTitle,
    description: song.description,
    englishDescription: song.englishDescription,
    aliases: song.alternativeTitles,
  });

  const artistScores =
    song.artists?.map(({ artist }) =>
      maxScore([
        scoreNamedEntitySearch(normalizedQuery, {
          primaryName: artist.name,
          englishName: artist.englishName,
          aliases: artist.aliases,
        }),
        scoreSingleField(normalizedQuery, artist.bio, {
          exact: 180,
          prefix: 160,
          contains: 140,
        }),
        scoreSingleField(normalizedQuery, artist.englishBio, {
          exact: 130,
          prefix: 120,
          contains: 110,
        }),
      ]),
    ) ?? [];

  const albumScore = song.album
    ? scoreNamedEntitySearch(normalizedQuery, {
        primaryName: song.album.name,
        englishName: song.album.englishName,
        description: song.album.description,
        englishDescription: song.album.englishDescription,
      }) * 0.85
    : 0;

  const genreScore = song.genre
    ? scoreNamedEntitySearch(normalizedQuery, {
        primaryName: song.genre.name,
        englishName: song.genre.englishName,
        description: song.genre.description,
        englishDescription: song.genre.englishDescription,
      }) * 0.75
    : 0;

  return maxScore([
    selfScore,
    ...artistScores,
    albumScore,
    genreScore,
  ]);
}

export function scoreArtistSearch(
  query: string,
  artist: {
    name: string;
    englishName?: string | null;
    aliases?: string[] | null;
    bio?: string | null;
    englishBio?: string | null;
  },
): number {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return 0;

  return maxScore([
    scoreNamedEntitySearch(normalizedQuery, {
      primaryName: artist.name,
      englishName: artist.englishName,
      aliases: artist.aliases,
    }),
    scoreSingleField(normalizedQuery, artist.bio, {
      exact: 300,
      prefix: 280,
      contains: 250,
    }),
    scoreSingleField(normalizedQuery, artist.englishBio, {
      exact: 240,
      prefix: 220,
      contains: 200,
    }),
  ]);
}

export function buildSongSearchWhere(
  search: string,
): Prisma.SongWhereInput["OR"] {
  const match = searchContains(search);

  return [
    { title: match },
    { englishTitle: match },
    { description: match },
    { englishDescription: match },
    {
      artists: {
        some: {
          artist: {
            OR: [
              { name: match },
              { englishName: match },
              { bio: match },
              { englishBio: match },
            ],
          },
        },
      },
    },
    {
      album: {
        OR: [
          { name: match },
          { englishName: match },
          { description: match },
          { englishDescription: match },
        ],
      },
    },
    {
      genre: {
        OR: [
          { name: match },
          { englishName: match },
          { description: match },
          { englishDescription: match },
        ],
      },
    },
  ];
}

export function buildArtistSearchWhere(
  search: string,
): Prisma.ArtistWhereInput["OR"] {
  const match = searchContains(search);

  return [
    { name: match },
    { englishName: match },
    { bio: match },
    { englishBio: match },
  ];
}

export function buildAlbumSearchWhere(
  search: string,
): Prisma.AlbumWhereInput["OR"] {
  const match = searchContains(search);

  return [
    { name: match },
    { englishName: match },
    { description: match },
    { englishDescription: match },
  ];
}

export function buildGenreSearchWhere(
  search: string,
): Prisma.GenreWhereInput["OR"] {
  const match = searchContains(search);

  return [
    { name: match },
    { englishName: match },
    { description: match },
    { englishDescription: match },
  ];
}

export function sortBySearchScore<T>(
  items: T[],
  query: string,
  scoreFn: (query: string, item: T) => number,
  tiebreaker?: (left: T, right: T) => number,
): T[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return items;

  return [...items].sort((left, right) => {
    const scoreDelta =
      scoreFn(normalizedQuery, right) - scoreFn(normalizedQuery, left);
    if (scoreDelta !== 0) return scoreDelta;
    return tiebreaker?.(left, right) ?? 0;
  });
}

export function paginateItems<T>(
  items: T[],
  page: number,
  limit: number,
): T[] {
  const skip = (page - 1) * limit;
  return items.slice(skip, skip + limit);
}
