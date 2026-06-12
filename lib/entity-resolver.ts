import { cache } from "react";
import { prisma } from "@/db";
import type { Prisma } from "@prisma/client";

const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

export function looksLikeCuid(value: string): boolean {
  return CUID_PATTERN.test(value);
}

type ResolveResult<T> =
  | { entity: T; matchedBy: "slug" }
  | { entity: T; matchedBy: "id" }
  | null;

async function resolveBySlugOrId<T>(
  param: string,
  findBySlug: (slug: string) => Promise<T | null>,
  findById: (id: string) => Promise<T | null>,
): Promise<ResolveResult<T>> {
  const bySlug = await findBySlug(param);
  if (bySlug) {
    return { entity: bySlug, matchedBy: "slug" };
  }

  if (looksLikeCuid(param)) {
    const byId = await findById(param);
    if (byId) {
      return { entity: byId, matchedBy: "id" };
    }
  }

  return null;
}

const seoInclude = { seo: true } as const;

type ArtistWithSeo = Prisma.ArtistGetPayload<{ include: typeof seoInclude }>;
type AlbumWithSeo = Prisma.AlbumGetPayload<{ include: typeof seoInclude }>;
type GenreWithSeo = Prisma.GenreGetPayload<{ include: typeof seoInclude }>;
type SongWithSeo = Prisma.SongGetPayload<{ include: typeof seoInclude }>;
type PlaylistWithSeo = Prisma.PlaylistGetPayload<{
  include: typeof seoInclude;
}>;

// Wrapped with React cache() so generateMetadata and the layout function share
// the same DB result within a single server render, avoiding double queries.
export const findArtistBySlugOrId = cache(function findArtistBySlugOrId(
  param: string,
): Promise<ResolveResult<ArtistWithSeo>> {
  return resolveBySlugOrId(
    param,
    (slug) => prisma.artist.findUnique({ where: { slug }, include: seoInclude }),
    (id) => prisma.artist.findUnique({ where: { id }, include: seoInclude }),
  );
});

export const findAlbumBySlugOrId = cache(function findAlbumBySlugOrId(
  param: string,
): Promise<ResolveResult<AlbumWithSeo>> {
  return resolveBySlugOrId(
    param,
    (slug) => prisma.album.findUnique({ where: { slug }, include: seoInclude }),
    (id) => prisma.album.findUnique({ where: { id }, include: seoInclude }),
  );
});

export const findGenreBySlugOrId = cache(function findGenreBySlugOrId(
  param: string,
): Promise<ResolveResult<GenreWithSeo>> {
  return resolveBySlugOrId(
    param,
    (slug) => prisma.genre.findUnique({ where: { slug }, include: seoInclude }),
    (id) => prisma.genre.findUnique({ where: { id }, include: seoInclude }),
  );
});

export const findSongBySlugOrId = cache(function findSongBySlugOrId(
  param: string,
  options?: { publishedOnly?: boolean },
): Promise<ResolveResult<SongWithSeo>> {
  const publishedOnly = options?.publishedOnly ?? false;

  return resolveBySlugOrId(
    param,
    (slug) =>
      prisma.song.findFirst({
        where: { slug, ...(publishedOnly ? { isPublished: true } : {}) },
        include: seoInclude,
      }),
    (id) =>
      prisma.song.findFirst({
        where: { id, ...(publishedOnly ? { isPublished: true } : {}) },
        include: seoInclude,
      }),
  );
});

export const findPlaylistBySlugOrId = cache(function findPlaylistBySlugOrId(
  param: string,
): Promise<ResolveResult<PlaylistWithSeo>> {
  return resolveBySlugOrId(
    param,
    (slug) =>
      prisma.playlist.findUnique({ where: { slug }, include: seoInclude }),
    (id) => prisma.playlist.findUnique({ where: { id }, include: seoInclude }),
  );
});
