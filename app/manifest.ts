import type { MetadataRoute } from "next";
import {
  BRAND_BACKGROUND_COLOR,
  BRAND_THEME_COLOR,
} from "@/lib/brand-colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Myanify",
    short_name: "Myanify",
    description: "Stream Myanmar songs with integrated lyrics. Discover traditional and modern Myanmar music, create playlists, and enjoy synchronized lyrics.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_BACKGROUND_COLOR,
    theme_color: BRAND_THEME_COLOR,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
