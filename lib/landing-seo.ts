import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const landingMetadata: Metadata = {
  title: "Myanify - Stream Myanmar Music with Synchronized Lyrics",
  description:
    "Discover the rich tapestry of Myanmar music. Stream traditional and modern Myanmar songs with real-time synchronized lyrics. Create playlists, explore artists, and experience Myanmar's musical heritage.",
  keywords: [
    "Myanmar music",
    "Myanmar songs",
    "streaming music",
    "synchronized lyrics",
    "Myanmar artists",
    "Myanmar music streaming",
    "traditional Myanmar music",
    "modern Myanmar music",
    "Myanmar playlist",
    "music with lyrics",
    "Myanmar culture",
    "Burmese music",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Myanify",
    title: "Myanify - Stream Myanmar Music with Synchronized Lyrics",
    description:
      "Discover the rich tapestry of Myanmar music. Stream traditional and modern Myanmar songs with real-time synchronized lyrics.",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "Myanify - Myanmar Music Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Myanify - Stream Myanmar Music with Synchronized Lyrics",
    description:
      "Discover the rich tapestry of Myanmar music with synchronized lyrics.",
    images: ["/icon.svg"],
  },
  alternates: {
    canonical: "/",
  },
};

export function getLandingStructuredData(avgRating?: number, reviewCount?: number) {
  const data: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Myanify",
    applicationCategory: "MusicApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Synchronized Lyrics",
      "Music Streaming",
      "Playlist Creation",
      "Artist Discovery",
      "Genre Browsing",
      "Search Functionality",
    ],
  };

  if (avgRating && reviewCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating.toFixed(1),
      ratingCount: reviewCount.toString(),
    };
  }

  return data;
}
