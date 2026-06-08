import { Prisma } from "@prisma/client";
import { prisma } from "@/db";
import type { SlugModel } from "@/lib/slug-types";
import { parseCommaList } from "@/lib/slug-utils";

export type SeoInput = {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImageUrl?: string | null;
  schemaMarkup?: unknown | null;
};

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSeoInput(input: SeoInput): Prisma.SeoMetadataCreateInput {
  let schemaMarkup:
    | Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput
    | undefined;

  if (input.schemaMarkup === null) {
    schemaMarkup = Prisma.JsonNull;
  } else if (
    typeof input.schemaMarkup === "string" &&
    input.schemaMarkup.trim()
  ) {
    schemaMarkup = JSON.parse(input.schemaMarkup) as Prisma.InputJsonValue;
  } else if (
    typeof input.schemaMarkup === "object" &&
    input.schemaMarkup !== null
  ) {
    schemaMarkup = input.schemaMarkup as Prisma.InputJsonValue;
  }

  const data: Prisma.SeoMetadataCreateInput = {
    title: emptyToNull(input.title ?? undefined),
    description: emptyToNull(input.description ?? undefined),
    keywords: parseCommaList(input.keywords),
    canonicalUrl: emptyToNull(input.canonicalUrl ?? undefined),
    ogTitle: emptyToNull(input.ogTitle ?? undefined),
    ogDescription: emptyToNull(input.ogDescription ?? undefined),
    ogImageUrl: emptyToNull(input.ogImageUrl ?? undefined),
    twitterTitle: emptyToNull(input.twitterTitle ?? undefined),
    twitterDescription: emptyToNull(input.twitterDescription ?? undefined),
    twitterImageUrl: emptyToNull(input.twitterImageUrl ?? undefined),
  };

  if (schemaMarkup !== undefined) {
    data.schemaMarkup = schemaMarkup;
  }

  return data;
}

function hasSeoContent(data: ReturnType<typeof normalizeSeoInput>): boolean {
  return Boolean(
    data.title ||
      data.description ||
      (Array.isArray(data.keywords) && data.keywords.length > 0) ||
      data.canonicalUrl ||
      data.ogTitle ||
      data.ogDescription ||
      data.ogImageUrl ||
      data.twitterTitle ||
      data.twitterDescription ||
      data.twitterImageUrl ||
      "schemaMarkup" in data,
  );
}

export async function upsertSeoMetadata(
  existingSeoId: string | null | undefined,
  input: SeoInput | null | undefined,
): Promise<string | null> {
  if (input === undefined) {
    return existingSeoId ?? null;
  }

  const data = normalizeSeoInput(input ?? {});

  if (!hasSeoContent(data)) {
    if (existingSeoId) {
      await prisma.seoMetadata.delete({ where: { id: existingSeoId } });
    }
    return null;
  }

  if (existingSeoId) {
    await prisma.seoMetadata.update({
      where: { id: existingSeoId },
      data,
    });
    return existingSeoId;
  }

  const created = await prisma.seoMetadata.create({ data });
  return created.id;
}
