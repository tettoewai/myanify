export const SEE_ALL_SECTIONS = [
  "genres",
  "artists",
  "albums",
  "playlists",
  "recently-played",
] as const;

export type SeeAllSection = (typeof SEE_ALL_SECTIONS)[number];

export function isSeeAllSection(value: string): value is SeeAllSection {
  return (SEE_ALL_SECTIONS as readonly string[]).includes(value);
}

export const SEE_ALL_SECTION_META: Record<
  SeeAllSection,
  { title: string; description?: string }
> = {
  genres: {
    title: "Browse Genres",
    description: "Explore music by genre",
  },
  artists: {
    title: "Popular Artists",
    description: "Discover Myanmar's top artists",
  },
  albums: {
    title: "Albums & Releases",
    description: "Full albums, EPs, and singles",
  },
  playlists: {
    title: "Featured Playlists",
    description: "Curated collections to explore",
  },
  "recently-played": {
    title: "Recently Played",
    description: "Pick up where you left off",
  },
};
