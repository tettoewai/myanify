import { cn } from "@/lib/utils";

/** Fades lyric text at scroll edges via CSS mask (no color overlay). */
export const lyricsScrollMaskClass = cn(
  "[mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_86%,transparent_100%)]",
  "[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_86%,transparent_100%)]",
);
