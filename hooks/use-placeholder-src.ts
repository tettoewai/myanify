"use client";

import { useSyncExternalStore } from "react";
import { getPlaceholderSrc, PLACEHOLDER, type PlaceholderTheme } from "@/lib/placeholders";

function getThemeFromDocument(): PlaceholderTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

/**
 * Returns the placeholder image path for the active theme (.dark on <html>).
 * Updates when the theme class changes (e.g. after a theme toggle).
 */
export function usePlaceholderSrc(): string {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeFromDocument,
    () => "dark" as PlaceholderTheme
  );
  return getPlaceholderSrc(theme);
}

/** For comparing whether a URL is any placeholder (e.g. playlist collage filters) */
export function isPlaceholderSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  return src === PLACEHOLDER.light || src === PLACEHOLDER.dark;
}
