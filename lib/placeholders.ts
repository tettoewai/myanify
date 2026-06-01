/** Public paths for fallback cover/avatar images */
export const PLACEHOLDER = {
  light: "/placeholder.svg",
  dark: "/placeholder-dark.webp",
} as const;

export type PlaceholderTheme = keyof typeof PLACEHOLDER;

export function getPlaceholderSrc(theme: PlaceholderTheme = "dark"): string {
  return PLACEHOLDER[theme];
}
