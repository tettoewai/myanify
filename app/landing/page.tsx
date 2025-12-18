import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPageContent } from "@/components/landing-page";
import { StructuredData } from "@/components/structured-data";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

export const metadata: Metadata = {
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
    url: `${siteUrl}/landing`,
    siteName: "Myanify",
    title: "Myanify - Stream Myanmar Music with Synchronized Lyrics",
    description:
      "Discover the rich tapestry of Myanmar music. Stream traditional and modern Myanmar songs with real-time synchronized lyrics.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Myanify - Myanmar Music Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Myanify - Stream Myanmar Music with Synchronized Lyrics",
    description:
      "Discover the rich tapestry of Myanmar music with synchronized lyrics.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/landing",
  },
};

// Structured data for SEO
const landingPageStructuredData = {
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
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1250",
  },
};

export default function LandingPage() {
  return (
    <>
      <StructuredData data={landingPageStructuredData} />
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Myanify</div>
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </div>
        }
      >
        <LandingPageContent />
      </Suspense>
    </>
  );
}

