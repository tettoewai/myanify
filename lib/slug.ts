import { prisma } from "@/db";
import type { SlugModel } from "@/lib/slug-types";
import { parseCommaList, slugify } from "@/lib/slug-utils";

async function slugExists(
  model: SlugModel,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const where = excludeId ? { slug, NOT: { id: excludeId } } : { slug };

  switch (model) {
    case "artist":
      return !!(await prisma.artist.findFirst({ where, select: { id: true } }));
    case "album":
      return !!(await prisma.album.findFirst({ where, select: { id: true } }));
    case "genre":
      return !!(await prisma.genre.findFirst({ where, select: { id: true } }));
    case "song":
      return !!(await prisma.song.findFirst({ where, select: { id: true } }));
    case "playlist":
      return !!(await prisma.playlist.findFirst({ where, select: { id: true } }));
  }
}

export async function ensureUniqueSlug(
  model: SlugModel,
  preferred: string,
  fallbackId: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(preferred) || `${model}-${fallbackId.slice(-8)}`;
  let candidate = base;
  let suffix = 2;

  while (await slugExists(model, candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export { parseCommaList, slugify } from "@/lib/slug-utils";