import { slugify } from "@/lib/slug-utils";

export function clientSlugify(text: string): string {
  return slugify(text);
}

export type SeoFormValues = {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImageUrl: string;
  schemaMarkup: string;
};

export const emptySeoFormValues = (): SeoFormValues => ({
  title: "",
  description: "",
  keywords: "",
  canonicalUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  twitterTitle: "",
  twitterDescription: "",
  twitterImageUrl: "",
  schemaMarkup: "",
});

export function seoFormFromApi(seo: {
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImageUrl?: string | null;
  schemaMarkup?: unknown | null;
} | null | undefined): SeoFormValues {
  if (!seo) {
    return emptySeoFormValues();
  }

  return {
    title: seo.title ?? "",
    description: seo.description ?? "",
    keywords: (seo.keywords ?? []).join(", "),
    canonicalUrl: seo.canonicalUrl ?? "",
    ogTitle: seo.ogTitle ?? "",
    ogDescription: seo.ogDescription ?? "",
    ogImageUrl: seo.ogImageUrl ?? "",
    twitterTitle: seo.twitterTitle ?? "",
    twitterDescription: seo.twitterDescription ?? "",
    twitterImageUrl: seo.twitterImageUrl ?? "",
    schemaMarkup:
      seo.schemaMarkup != null
        ? JSON.stringify(seo.schemaMarkup, null, 2)
        : "",
  };
}

export function seoFormToApi(values: SeoFormValues) {
  return {
    title: values.title || null,
    description: values.description || null,
    keywords: values.keywords,
    canonicalUrl: values.canonicalUrl || null,
    ogTitle: values.ogTitle || null,
    ogDescription: values.ogDescription || null,
    ogImageUrl: values.ogImageUrl || null,
    twitterTitle: values.twitterTitle || null,
    twitterDescription: values.twitterDescription || null,
    twitterImageUrl: values.twitterImageUrl || null,
    schemaMarkup: values.schemaMarkup.trim() || null,
  };
}
