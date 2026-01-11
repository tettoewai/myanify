import type { Metadata, Viewport } from "next";
import type React from "react";

import { Providers } from "@/components/providers";
import { WebsiteStructuredData } from "@/components/structured-data";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

export const metadata: Metadata = {
  title: {
    default: "Myanify - Myanmar Music Streaming",
    template: "%s | Myanify",
  },
  description:
    "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics.",
  generator: "Next.js",
  applicationName: "Myanify",
  keywords: [
    "Myanmar music",
    "streaming",
    "lyrics",
    "Myanmar songs",
    "playlist",
    "Myanmar artist",
    "music streaming",
    "synchronized lyrics",
  ],
  authors: [{ name: "Myanify" }],
  creator: "Myanify",
  publisher: "Myanify",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Myanify",
    title: "Myanify - Myanmar Music Streaming",
    description:
      "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics.",
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
    title: "Myanify - Myanmar Music Streaming",
    description:
      "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music.",
    images: ["/og-image.png"],
    creator: "@myanify",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://myanify.com";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <WebsiteStructuredData
          name="Myanify"
          url={siteUrl}
          description="Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics."
          logo={`${siteUrl}/icon.svg`}
        />
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
