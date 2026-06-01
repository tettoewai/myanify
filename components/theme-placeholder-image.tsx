"use client";

import Image, { type ImageProps } from "next/image";
import { PLACEHOLDER } from "@/lib/placeholders";
import { cn } from "@/lib/utils";

type ThemePlaceholderImageProps = Omit<ImageProps, "src"> & {
  alt: string;
};

/**
 * Renders light and dark placeholder assets; only the one matching
 * the active theme (.dark on <html>) is visible. No JS theme hook required.
 */
export function ThemePlaceholderImage({
  className,
  alt,
  ...props
}: ThemePlaceholderImageProps) {
  return (
    <>
      <Image
        src={PLACEHOLDER.light}
        alt={alt}
        className={cn(className, "dark:hidden")}
        {...props}
      />
      <Image
        src={PLACEHOLDER.dark}
        alt={alt}
        className={cn(className, "hidden dark:block")}
        {...props}
      />
    </>
  );
}
