import { Metadata } from "next";
import { ListenerLayoutWrapper } from "@/components/listener-layout-wrapper";

export const metadata: Metadata = {
  title: "Myanify - Myanmar Music Streaming",
  description:
    "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics.",
  openGraph: {
    title: "Myanify - Myanmar Music Streaming",
    description:
      "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics.",
    type: "website",
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
  },
};

export default function ListenerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ListenerLayoutWrapper>{children}</ListenerLayoutWrapper>;
}
