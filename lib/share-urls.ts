import { getSiteUrl } from "@/lib/site-url";

export type ShareableEntity = "song" | "album" | "artist" | "playlist";

export function sharePath(
  type: ShareableEntity,
  id: string,
): string {
  return `/${type}/${id}`;
}

export function getAbsoluteShareUrl(
  type: ShareableEntity,
  id: string,
  origin?: string,
): string {
  const base = origin ?? getSiteUrl();
  return new URL(sharePath(type, id), base).href;
}
