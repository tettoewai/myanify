import type { Metadata } from "next";
import type { SeoMetadata } from "@prisma/client";
import { getSiteUrl } from "@/lib/site-url";
import { absoluteEntityUrl, type RoutableEntity } from "@/lib/routes";

export const SEO_REVALIDATE_SECONDS = 3600;
export const MAX_STATIC_PATHS = 1000;

interface SeoFallbacks {
  title: string;
  description: string;
  keywords?: string[];
  imageUrl?: string | null;
  entityType: RoutableEntity;
  slug: string;
  openGraphType?:
    | "website"
    | "article"
    | "profile"
    | "music.song"
    | "music.album"
    | "music.playlist";
}

function resolveImageUrl(imageUrl?: string | null): string {
  return imageUrl || "/placeholder.svg";
}

export function buildEntityMetadata(
  seo: SeoMetadata | null | undefined,
  fallbacks: SeoFallbacks,
): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalPath =
    seo?.canonicalUrl ?? absoluteEntityUrl(siteUrl, fallbacks.entityType, fallbacks.slug);
  const canonical =
    seo?.canonicalUrl?.startsWith("http")
      ? seo.canonicalUrl
      : canonicalPath;

  const title = seo?.title ?? fallbacks.title;
  const description = seo?.description ?? fallbacks.description;
  const keywords =
    seo?.keywords && seo.keywords.length > 0
      ? seo.keywords
      : fallbacks.keywords;

  const ogTitle = seo?.ogTitle ?? title;
  const ogDescription = seo?.ogDescription ?? description;
  const ogImage = resolveImageUrl(seo?.ogImageUrl ?? fallbacks.imageUrl);

  const twitterTitle = seo?.twitterTitle ?? ogTitle;
  const twitterDescription = seo?.twitterDescription ?? ogDescription;
  const twitterImage = resolveImageUrl(
    seo?.twitterImageUrl ?? seo?.ogImageUrl ?? fallbacks.imageUrl,
  );

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: fallbacks.openGraphType ?? "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
      siteName: "Myanify",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: twitterTitle,
      description: twitterDescription,
      images: [twitterImage],
    },
    alternates: {
      canonical,
    },
  };
}

export function notFoundMetadata(label: string): Metadata {
  return {
    title: `${label} Not Found`,
    description: `The ${label.toLowerCase()} you are looking for could not be found.`,
  };
}

export function isSchemaMarkup(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
