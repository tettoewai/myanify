import { ensureUniqueSlug } from "@/lib/slug";
import { parseCommaList, slugify } from "@/lib/slug-utils";
import type { SlugModel } from "@/lib/slug-types";

export type { SlugModel };

export async function resolveEntitySlug(
  model: SlugModel,
  options: {
    providedSlug?: string | null;
    fallbackName?: string | null;
    entityId: string;
    currentSlug?: string | null;
  },
): Promise<string> {
  if (options.providedSlug === undefined && options.currentSlug) {
    return options.currentSlug;
  }

  const preferred =
    options.providedSlug?.trim() ||
    slugify(options.fallbackName ?? "") ||
    `${model}-${options.entityId.slice(-8)}`;

  return ensureUniqueSlug(model, preferred, options.entityId, options.entityId);
}

export async function resolveEntitySlugForCreate(
  model: SlugModel,
  options: {
    providedSlug?: string | null;
    fallbackName?: string | null;
    tempId: string;
  },
): Promise<string> {
  const preferred =
    options.providedSlug?.trim() ||
    slugify(options.fallbackName ?? "") ||
    `${model}-${options.tempId.slice(-8)}`;

  return ensureUniqueSlug(model, preferred, options.tempId);
}

export { parseCommaList };
