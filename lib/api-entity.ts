import {
  findAlbumBySlugOrId,
  findArtistBySlugOrId,
  findGenreBySlugOrId,
  findPlaylistBySlugOrId,
  findSongBySlugOrId,
} from "@/lib/entity-resolver";

export async function resolveSongId(param: string, publishedOnly = false) {
  const result = await findSongBySlugOrId(param, { publishedOnly });
  return result?.entity.id ?? null;
}

export async function resolveArtistId(param: string) {
  const result = await findArtistBySlugOrId(param);
  return result?.entity.id ?? null;
}

export async function resolveAlbumId(param: string) {
  const result = await findAlbumBySlugOrId(param);
  return result?.entity.id ?? null;
}

export async function resolveGenreId(param: string) {
  const result = await findGenreBySlugOrId(param);
  return result?.entity.id ?? null;
}

export async function resolvePlaylistId(param: string) {
  const result = await findPlaylistBySlugOrId(param);
  return result?.entity.id ?? null;
}
