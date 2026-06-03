import type { Metadata, Viewport } from "next";
import type React from "react";

import { Providers } from "@/components/providers";
import { WebsiteStructuredData } from "@/components/structured-data";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

import { BRAND_THEME_COLOR } from "@/lib/brand-colors";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

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
  },
  twitter: {
    card: "summary",
    title: "Myanify - Myanmar Music Streaming",
    description:
      "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music.",
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
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  verification: {
    google: "wLLttKwHFEdPT2RbYpz_EsAP7VsY9DUHCA1GHuixcMw",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: BRAND_THEME_COLOR },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <WebsiteStructuredData
          name="Myanify"
          url={getSiteUrl()}
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
