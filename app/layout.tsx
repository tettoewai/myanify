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
