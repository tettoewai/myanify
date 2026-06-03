"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ALargeSmall } from "lucide-react";

export const LYRIC_SIZES = ["sm", "md", "lg"] as const;
export type LyricSize = (typeof LYRIC_SIZES)[number];

export function nextLyricSize(size: LyricSize): LyricSize {
  const index = LYRIC_SIZES.indexOf(size);
  return LYRIC_SIZES[(index + 1) % LYRIC_SIZES.length];
}

const ICON_SIZE: Record<LyricSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

interface LyricSizeToggleProps {
  size: LyricSize;
  onSizeChange: (size: LyricSize) => void;
  variant?: "fullscreen" | "panel";
  className?: string;
}

export function LyricSizeToggle({
  size,
  onSizeChange,
  variant = "fullscreen",
  className,
}: LyricSizeToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Lyric size ${size}. Tap to change.`}
      title={`Lyric size: ${size}. Tap to cycle.`}
      onClick={() => onSizeChange(nextLyricSize(size))}
      className={cn(
        "h-9 w-9 rounded-full cursor-pointer shrink-0",
        variant === "fullscreen" &&
          "text-white bg-white/20 hover:bg-white/30 hover:text-white",
        variant === "panel" &&
          "text-primary-foreground bg-primary/20 hover:bg-primary/30",
        className,
      )}
    >
      <ALargeSmall className={cn(ICON_SIZE[size])} aria-hidden />
    </Button>
  );
}
